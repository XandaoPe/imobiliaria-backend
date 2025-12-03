// src/imovel/schemas/imovel.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Empresa } from 'src/empresa/schemas/empresa.schema';

export type ImovelDocument = Imovel & Document;

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

    @Prop({ required: true, enum: TipoImovel, set: (v: string) => v.toUpperCase() })
    tipo: TipoImovel;

    @Prop({ required: true })
    endereco: string;

    @Prop({ required: true })
    valor: number;

    @Prop({ default: false })
    disponivel: boolean;

    // ⭐️ NOVO: Array para armazenar os nomes/caminhos dos arquivos de fotos
    @Prop({ type: [String], default: [] })
    fotos: string[];

    @Prop({ type: Types.ObjectId, ref: Empresa.name, required: true })
    empresa: Types.ObjectId;
}

export const ImovelSchema = SchemaFactory.createForClass(Imovel);