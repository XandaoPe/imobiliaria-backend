import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

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

    @Prop({ default: 'NOVO', enum: ['NOVO', 'EM_ATENDIMENTO', 'CONCLUIDO'] })
    status: string;
}

export const LeadSchema = SchemaFactory.createForClass(Lead);