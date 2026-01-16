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
    OPERACIONAL = 'OPERACIONAL',
    OUTROS = 'OUTROS',
}

export enum StatusFinanceiro {
    PENDENTE = 'PENDENTE',
    PAGO = 'PAGO',
    CANCELADO = 'CANCELADO',
    ATRASADO = 'ATRASADO',
}

@Schema({
    timestamps: true,
    collection: 'financeiros'
})
export class Financeiro {
    @Prop({ type: Types.ObjectId, ref: 'Empresa', required: true })
    empresa: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'Imovel', required: true })
    imovel: Types.ObjectId;

    /**
     * No caso de RECEITA: É o locatário/comprador
     * No caso de DESPESA/REPASSE: É o proprietário do imóvel
     */
    @Prop({ type: Types.ObjectId, ref: 'Cliente', required: true })
    cliente: Types.ObjectId;

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

    @Prop({
        required: true,
        enum: StatusFinanceiro,
        default: StatusFinanceiro.PENDENTE
    })
    status: string;

    @Prop()
    parcelaNumero?: number;

    @Prop({ required: true })
    descricao: string;

    @Prop()
    observacoes?: string;
}

export const FinanceiroSchema = SchemaFactory.createForClass(Financeiro);

// Adicionando índices para otimizar as buscas do findAllByEmpresa
FinanceiroSchema.index({ empresa: 1, status: 1 });
FinanceiroSchema.index({ negociacao: 1 });
FinanceiroSchema.index({ dataVencimento: 1 });