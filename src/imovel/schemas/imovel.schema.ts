// src/imovel/schemas/imovel.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Empresa } from '../../empresa/schemas/empresa.schema';

export type ImovelDocument = Imovel & Document;

// Simples Enum para Tipo de Imóvel
export enum TipoImovel {
    CASA = 'CASA',
    APARTAMENTO = 'APARTAMENTO',
    TERRENO = 'TERRENO',
    COMERCIAL = 'COMERCIAL',
}

@Schema({ timestamps: true })
export class Imovel {
    @Prop({ required: true })
    titulo: string;

    @Prop({
        required: true,
        enum: TipoImovel,

        set: (v: string) => v.toUpperCase()
    })
    tipo: TipoImovel;

    @Prop({ required: true })
    endereco: string; 

    @Prop({ type: Number, required: true })
    valor: number;

    @Prop({ default: false })
    disponivel: boolean;

    // 🔑 CHAVE DO MULTITENANCY: Vincula o imóvel a uma empresa
    @Prop({ type: Types.ObjectId, ref: 'Empresa', required: true })
    empresa: Types.ObjectId;
}

export const ImovelSchema = SchemaFactory.createForClass(Imovel);