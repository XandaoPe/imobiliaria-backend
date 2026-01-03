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
    FECHADO = 'FECHADO', // ou CONCLUIDO
    PERDIDO = 'PERDIDO',
    CANCELADO = 'CANCELADO',
}

export enum TipoNegociacao {
    VENDA = 'VENDA',
    ALUGUEL = 'ALUGUEL',
}

@Schema({ _id: false }) // Sub-schema para o histórico (Timeline)
class HistoricoEvento {
    @Prop({ default: Date.now })
    data: Date;

    @Prop({ required: true })
    descricao: string;

    @Prop()
    usuario_nome: string; // Nome do corretor que fez a anotação
}

@Schema({ timestamps: true })
export class Negociacao {
    @Prop({ type: Types.ObjectId, ref: 'Imovel', required: true })
    imovel: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'Cliente', required: true })
    cliente: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'Empresa', required: true })
    empresa: Types.ObjectId;

    @Prop({ required: true, enum: TipoNegociacao })
    tipo: TipoNegociacao;

    @Prop({ required: true, enum: StatusNegociacao, default: StatusNegociacao.PROPOSTA })
    status: StatusNegociacao;

    @Prop({ required: true })
    valor_acordado: number;

    @Prop()
    data_fechamento: Date;

    // Campos específicos para Aluguel (opcionais se for Venda)
    @Prop()
    data_inicio_contrato?: Date;

    @Prop()
    data_fim_contrato?: Date;

    @Prop()
    dia_vencimento_aluguel?: number;

    @Prop({ type: [HistoricoEvento], default: [] })
    historico: HistoricoEvento[];

    @Prop()
    observacoes_gerais: string;
}

export const NegociacaoSchema = SchemaFactory.createForClass(Negociacao);