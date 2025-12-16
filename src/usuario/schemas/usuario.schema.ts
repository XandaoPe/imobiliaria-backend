import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Empresa } from '../../empresa/schemas/empresa.schema';

export type UsuarioDocument = Usuario & Document;

export enum PerfisEnum {
    ADM_GERAL = 'ADM_GERAL',
    GERENTE = 'GERENTE',
    CORRETOR = 'CORRETOR',
    SUPORTE = 'SUPORTE',
}

@Schema({ timestamps: true })
export class Usuario {

    @Prop({ required: true })
    email: string;

    @Prop({ required: true })
    senha: string;

    @Prop({ required: true })
    nome: string;

    @Prop({ type: Types.ObjectId, ref: 'Empresa', required: true })
    empresa: Types.ObjectId;

    @Prop({ required: true, enum: PerfisEnum, default: PerfisEnum.CORRETOR })
    perfil: PerfisEnum;

    @Prop({ default: true })
    ativo: boolean;
}

export const UsuarioSchema = SchemaFactory.createForClass(Usuario);

UsuarioSchema.index({ email: 1, empresa: 1 }, { unique: true });

// 2. 🖥️ Configuração de Serialização (toJSON)
UsuarioSchema.set('toJSON', {
    virtuals: true,
    transform: (doc, ret) => {
        const transformed = ret as any;

        transformed.id = transformed._id.toString();

        if (transformed.empresa && transformed.empresa instanceof Types.ObjectId) {
            transformed.empresa = transformed.empresa.toString();
        }

        delete transformed._id;
        delete transformed.__v;

        return transformed;
    },
});