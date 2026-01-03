import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export class Historico {
    @Prop({ default: Date.now })
    data: Date;

    @Prop({ required: true })
    descricao: string;

    @Prop()
    autor: string; // Nome do corretor que anotou
}

@Schema({ timestamps: true })
export class Lead extends Document {
    @Prop({ required: true })
    nome: string;

    @Prop({ required: true })
    contato: string;

    @Prop({ type: Types.ObjectId, ref: 'Imovel', required: true })
    imovel: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'Empresa', required: true })
    empresa: Types.ObjectId;

    @Prop({
        default: 'NOVO',
        enum: ['NOVO', 'EM_ANDAMENTO', 'CONCLUIDO']
    })
    status: string;

    @Prop({ type: [Object], default: [] })
    historico: Historico[];
}

export const LeadSchema = SchemaFactory.createForClass(Lead);