// src/configuracao/schemas/configuracao.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ConfiguracaoDocument = Configuracao & Document;

@Schema({ timestamps: true })
export class Configuracao {
    @Prop({ required: true })
    chave: string; // Ex: 'TAXA_VENDA', 'TAXA_ALUGUEL'

    @Prop({ required: true, type: Number })
    valor: number; // Ex: 6.0, 10.0

    @Prop({ default: 'percentual' })
    tipo: string; // Ex: 'percentual', 'moeda', 'dias'

    @Prop({ required: true, type: Types.ObjectId, ref: 'Empresa' })
    empresa: Types.ObjectId;
}

export const ConfiguracaoSchema = SchemaFactory.createForClass(Configuracao);