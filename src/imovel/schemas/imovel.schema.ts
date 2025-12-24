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

    @Prop({ default: 0 })
    valor?: number;

    @Prop({ default: 0 })
    aluguel?: number;

    // === CAMPOS OBRIGATÓRIOS DO PASSO 1 ===
    @Prop({ default: false })
    disponivel: boolean;

    // === CAMPOS OPCIONAIS DO PASSO 2 (CORREÇÃO APLICADA) ===

    // String opcional
    @Prop({ required: false, default: null })
    cidade?: string;

    // String opcional (descrição)
    @Prop({ required: false, default: null })
    descricao?: string;

    // String opcional (detalhes)
    @Prop({ required: false, default: null })
    detalhes?: string;

    // Número inteiro opcional (Quartos)
    // O Mongoose infere o tipo Number (padrão Mongoose)
    @Prop({ required: false, default: null })
    quartos?: number;

    // Número inteiro opcional (Banheiros)
    @Prop({ required: false, default: null })
    banheiros?: number;

    @Prop({ required: false, default: null })
    area_terreno?: number;

    @Prop({ required: false, default: null })
    area_construida?: number;

    // Booleano opcional (Garagem)
    @Prop({ default: false }) // Booleans geralmente têm um default
    garagem: boolean;

    // === CAMPOS DE RELACIONAMENTO/SISTEMA ===

    @Prop({ type: [String], default: [] })
    fotos: string[];

    @Prop({ type: Types.ObjectId, ref: Empresa.name, required: true })
    empresa: Types.ObjectId;
}

export const ImovelSchema = SchemaFactory.createForClass(Imovel);