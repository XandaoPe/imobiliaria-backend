import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ComissaoDocument = Comissao & Document;

export enum ComissaoStatus {
    PENDENTE = 'PENDENTE',
    APROVADA = 'APROVADA',
    PAGA = 'PAGA',
    CANCELADA = 'CANCELADA',
}

export enum TipoNegocioComissao {
    VENDA = 'VENDA',
    ALUGUEL = 'ALUGUEL',
}

export enum FormaPagamentoComissao {
    PIX = 'PIX',
    TRANSFERENCIA = 'TRANSFERENCIA',
    DINHEIRO = 'DINHEIRO',
    OUTRO = 'OUTRO',
}

@Schema({ timestamps: true, collection: 'comissoes' })
export class Comissao {
    @Prop({ type: Types.ObjectId, ref: 'Financeiro', required: true, index: true })
    financeiroId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'Usuario', required: true, index: true })
    usuarioId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'ComissaoRegra', index: true })
    regraId?: Types.ObjectId;

    // Dados do negócio
    @Prop({
        type: String,
        required: true,
        enum: TipoNegocioComissao
    })
    tipoNegocio: TipoNegocioComissao;

    @Prop({ required: true, min: 0 })
    valorTotal: number;

    @Prop({ required: true, min: 0 })
    valorBaseCalculo: number;

    // Cálculo da comissão
    @Prop({ required: true, min: 0, max: 100 })
    percentualAplicado: number;

    @Prop({ required: true, min: 0 })
    valorComissao: number;

    @Prop({ min: 0, default: 0 })
    valorFixoAdicional?: number;

    // Status e pagamento
    @Prop({
        type: String,
        required: true,
        enum: ComissaoStatus,
        default: ComissaoStatus.PENDENTE
    })
    status: ComissaoStatus;

    @Prop()
    dataPagamento?: Date;

    @Prop({
        type: String,
        enum: FormaPagamentoComissao
    })
    formaPagamento?: FormaPagamentoComissao;

    // Informações do usuário (snapshot)
    @Prop({ required: true })
    usuarioNome: string;

    @Prop({ required: true })
    usuarioCargo: string;

    @Prop()
    usuarioNivel?: string;

    // Auditoria
    @Prop({ type: Types.ObjectId, ref: 'Usuario', required: true })
    distribuidoPor: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'Usuario' })
    pagoPor?: Types.ObjectId;

    @Prop({ trim: true })
    observacao?: string;

    @Prop({ trim: true })
    motivoCancelamento?: string;
}

export const ComissaoSchema = SchemaFactory.createForClass(Comissao);

// Índices adicionais
ComissaoSchema.index({ usuarioId: 1, status: 1 });
ComissaoSchema.index({ status: 1, dataPagamento: 1 });
ComissaoSchema.index({ createdAt: -1 });
ComissaoSchema.index({ financeiroId: 1, usuarioId: 1 }, { unique: true });