import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

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

    // ADICIONADO: Referência para a Negociação que originou este lançamento
    @Prop({ type: Types.ObjectId, ref: 'Negociacao', required: false })
    negociacao: Types.ObjectId;

    @Prop({ required: false })
    negociacaoCodigo: string;

    @Prop({ required: true, enum: TipoLancamento })
    tipo: TipoLancamento;

    @Prop({ required: true, enum: CategoriaLancamento })
    categoria: CategoriaLancamento;

    @Prop({ required: true })
    valor: number;

    @Prop()
    valorPago?: number;

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

    @Prop()
    observacoes?: string;
}

export const FinanceiroSchema = SchemaFactory.createForClass(Financeiro);