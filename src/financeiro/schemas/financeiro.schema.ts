// src/financeiro/schemas/financeiro.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

// ⭐️ Certifique-se de que esta linha existe!
export type FinanceiroDocument = Financeiro & Document;

export enum TipoLancamento {
    RECEITA = 'RECEITA',
    DESPESA = 'DESPESA',
}

export enum CategoriaLancamento {
    ALUGUEL = 'ALUGUEL',
    VENDA = 'VENDA',
    TAXA_ADMINISTRACAO = 'TAXA_ADMINISTRACAO',
    REPASSE = 'REPASSE',
    MANUTENCAO = 'MANUTENCAO',
}

@Schema({ timestamps: true })
export class Financeiro {
    @Prop({ type: Types.ObjectId, ref: 'Empresa', required: true })
    empresa: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'Imovel', required: true })
    imovel: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'Cliente', required: true })
    cliente: Types.ObjectId;

    @Prop({ required: true, enum: TipoLancamento })
    tipo: TipoLancamento;

    @Prop({ required: true, enum: CategoriaLancamento })
    categoria: CategoriaLancamento;

    @Prop({ required: true })
    valor: number;

    @Prop({ required: true })
    dataVencimento: Date;

    @Prop()
    dataPagamento?: Date;

    @Prop({ default: 'PENDENTE', enum: ['PENDENTE', 'PAGO', 'CANCELADO', 'ATRASADO'] })
    status: string;

    @Prop()
    parcelaNumero?: number;

    @Prop()
    descricao: string;
}

export const FinanceiroSchema = SchemaFactory.createForClass(Financeiro);