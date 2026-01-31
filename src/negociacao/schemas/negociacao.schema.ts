import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NegociacaoDocument = Negociacao & Document;

export enum StatusNegociacao {
    PROSPECCAO = 'PROSPECCAO',
    VISITA = 'VISITA',
    PROPOSTA = 'PROPOSTA',
    ANALISE_DOCUMENTACAO = 'ANALISE_DOCUMENTACAO',
    CONTRATO_EM_REVISAO = 'CONTRATO_EM_REVISAO',
    ASSINADO = 'ASSINADO',
    FECHADO = 'FECHADO',
    PERDIDO = 'PERDIDO',
    CANCELADO = 'CANCELADO',
}

export enum TipoNegociacao {
    VENDA = 'VENDA',
    ALUGUEL = 'ALUGUEL',
}

@Schema({ _id: false })
class HistoricoEvento {
    @Prop({ default: Date.now })
    data: Date;

    @Prop({ required: true })
    descricao: string;

    @Prop()
    usuario_nome: string;
}

@Schema({ _id: false })
export class DadosFinanceiros {
    @Prop({ required: true })
    valorTotal: number;

    @Prop({ default: 0 })
    valorEntrada: number;

    @Prop({ required: true })
    qtdParcelas: number;

    @Prop({ required: true })
    valorParcela: number;

    @Prop()
    diaVencimento?: number;

    @Prop({ default: 0 })
    ajustePorcentagem: number;

    @Prop({ default: 0 })
    ajusteFixo: number;
}

@Schema({
    timestamps: true,
    collection: 'negociacaos'
})
export class Negociacao {
    @Prop({ type: Types.ObjectId, ref: 'Imovel', required: true })
    imovel: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'Cliente', required: true })
    cliente: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'Empresa', required: true })
    empresa: Types.ObjectId;

    @Prop({ required: true, enum: TipoNegociacao })
    tipo: TipoNegociacao;

    @Prop({ required: true, enum: StatusNegociacao, default: StatusNegociacao.PROSPECCAO })
    status: StatusNegociacao;

    @Prop({ required: true, default: 0 })
    valor_acordado: number;

    @Prop()
    data_fechamento: Date;

    @Prop({ type: [HistoricoEvento], default: [] })
    historico: HistoricoEvento[];

    @Prop({ default: "" })
    observacoes_gerais: string;

    @Prop({ type: String })
    dataAgendamento?: string;

    @Prop({ type: DadosFinanceiros })
    dadosFinanceiros?: DadosFinanceiros;

    @Prop({ unique: true })
    codigo: string;

    @Prop({ type: Types.ObjectId, ref: 'Usuario', required: false })
    vendedor?: Types.ObjectId;
}

export const NegociacaoSchema = SchemaFactory.createForClass(Negociacao);