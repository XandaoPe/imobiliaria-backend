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
    COMISSAO = 'COMISSAO',
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

    @Prop({
        type: String,
        required: true,
        validate: {
            validator: function (v: string) {
                return /^\d{4}-\d{2}-\d{2}$/.test(v);
            },
            message: 'dataVencimento deve estar no formato YYYY-MM-DD'
        }
    })
    dataVencimento: string;

    @Prop({
        type: String,
        validate: {
            validator: function (v: string) {
                if (!v) return true;
                return /^\d{4}-\d{2}-\d{2}$/.test(v);
            },
            message: 'dataPagamento deve estar no formato YYYY-MM-DD'
        }
    })
    dataPagamento?: string;

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

    @Prop({ default: false })
    comissoesDistribuidas: boolean;

    @Prop({
        type: {
            dataDistribuicao: String,
            distribuidoPor: { type: Types.ObjectId, ref: 'Usuario' },
            metodoCalculo: String,
            totalComissoes: { type: Number, default: 0 },
            observacao: String,
        },
        _id: false,
    })
    distribuicaoComissao?: {
        dataDistribuicao?: string;
        distribuidoPor?: Types.ObjectId;
        metodoCalculo?: string;
        totalComissoes: number;
        observacao?: string;
    };

    @Prop({ type: Types.ObjectId, ref: 'Usuario', required: false })
    comissionado?: Types.ObjectId; // Para lançamentos de comissão
}

export const FinanceiroSchema = SchemaFactory.createForClass(Financeiro);

// Adicionando índices para otimizar as buscas do findAllByEmpresa
FinanceiroSchema.index({ empresa: 1, status: 1 });
FinanceiroSchema.index({ negociacao: 1 });
FinanceiroSchema.index({ dataVencimento: 1 });
FinanceiroSchema.index({ comissoesDistribuidas: 1 });
FinanceiroSchema.index({ 'distribuicaoComissao.distribuidoPor': 1 });