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

    // ⭐️ REMOVA OS CAMPOS ANTIGOS DE valor E aluguel
    // ⭐️ ADICIONE OS NOVOS CAMPOS BOOLEANOS
    @Prop({ default: false })
    para_venda: boolean;

    @Prop({ default: false })
    para_aluguel: boolean;

    // ⭐️ ADICIONE OS VALORES NUMÉRICOS (agora condicionais)
    @Prop({ required: false, default: null })
    valor_venda?: number;

    @Prop({ required: false, default: null })
    valor_aluguel?: number;

    // === CAMPOS OBRIGATÓRIOS DO PASSO 1 ===
    @Prop({ default: false })
    disponivel: boolean;

    // === CAMPOS OPCIONAIS DO PASSO 2 ===
    @Prop({ required: false, default: null })
    cidade?: string;

    @Prop({ required: false, default: null })
    descricao?: string;

    @Prop({ required: false, default: null })
    detalhes?: string;

    @Prop({ required: false, default: null })
    quartos?: number;

    @Prop({ required: false, default: null })
    banheiros?: number;

    @Prop({ required: false, default: null })
    area_terreno?: number;

    @Prop({ required: false, default: null })
    area_construida?: number;

    @Prop({ default: false })
    garagem: boolean;

    // === CAMPOS DE RELACIONAMENTO/SISTEMA ===
    @Prop({ type: [String], default: [] })
    fotos: string[];

    @Prop({ type: Types.ObjectId, ref: Empresa.name, required: true })
    empresa: Types.ObjectId;
}

export const ImovelSchema = SchemaFactory.createForClass(Imovel);