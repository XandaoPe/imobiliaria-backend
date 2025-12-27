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
    empresa: Types.ObjectId | Empresa | string;

    @Prop({ required: true, enum: PerfisEnum, default: PerfisEnum.CORRETOR })
    perfil: PerfisEnum;

    @Prop({ default: true })
    ativo: boolean;

    // Adicione no Prop do seu Schema
    @Prop({ type: String, default: null })
    pushToken: string;
}

export const UsuarioSchema = SchemaFactory.createForClass(Usuario);

UsuarioSchema.index({ email: 1, empresa: 1 }, { unique: true });

// 2. 🖥️ Configuração de Serialização (toJSON)
UsuarioSchema.set('toJSON', {
    virtuals: true,
    transform: (doc, ret) => {
        // 'ret' é o objeto que será transformado em JSON
        const transformed = ret as Record<string, any>;

        // Converte o _id para id (string)
        if (transformed._id) {
            transformed.id = transformed._id.toString();
        }

        if (transformed.empresa && transformed.empresa instanceof Types.ObjectId) {
            transformed.empresa = transformed.empresa.toString();
        }

        // Remove campos sensíveis ou internos antes de enviar ao Front
        delete transformed._id;
        delete transformed.__v;
        delete transformed.senha; // Segurança: nunca envie a senha no JSON

        return transformed;
    },
});