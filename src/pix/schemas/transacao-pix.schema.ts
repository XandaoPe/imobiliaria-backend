// src/pix/schemas/transacao-pix.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TransacaoPixDocument = TransacaoPix & Document;

export enum StatusTransacaoPix {
    PENDENTE = 'PENDENTE',
    GERADO = 'GERADO',
    PAGO = 'PAGO',
    EXPIRADO = 'EXPIRADO',
    CANCELADO = 'CANCELADO',
    ERRO = 'ERRO'
}

@Schema({ timestamps: true, collection: 'transacoes_pix' })
export class TransacaoPix {
    @Prop({ type: Types.ObjectId, ref: 'Financeiro', required: true })
    lancamentoFinanceiro: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'Empresa', required: true })
    empresa: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'Usuario' })
    usuarioSolicitante?: Types.ObjectId;

    @Prop({ required: true, enum: ['CPF', 'CNPJ', 'EMAIL', 'TELEFONE', 'CHAVE_ALEATORIA'] })
    tipoChave: string;

    @Prop({ required: true })
    chaveDestinatario: string;

    @Prop({ required: true })
    nomeDestinatario: string;

    @Prop({ required: true })
    valor: number;

    @Prop({ required: true })
    descricao: string;

    @Prop({ required: true })
    payloadPix: string;

    @Prop()
    qrCodeBase64?: string;

    @Prop({
        type: String,
        required: true,
        enum: StatusTransacaoPix,
        default: StatusTransacaoPix.PENDENTE
    })
    status: StatusTransacaoPix;

    @Prop({
        type: String,
        validate: {
            validator: function (v: string) {
                if (!v) return true;
                return /^\d{4}-\d{2}-\d{2}$/.test(v);
            },
            message: 'dataExpiracao deve estar no formato YYYY-MM-DD'
        }
    })
    dataExpiracao?: string;

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

    @Prop()
    transacaoId?: string; // ID da transação no sistema do banco/gateway

    @Prop()
    codigoCopiaCola?: string; // Código PIX para copiar e colar

    @Prop()
    observacoes?: string;

    @Prop({ default: 0 })
    tentativasConsulta: number;

    @Prop()
    ultimaConsulta?: Date;

    @Prop()
    createdAt?: Date;

    @Prop()
    updatedAt?: Date;
}

export const TransacaoPixSchema = SchemaFactory.createForClass(TransacaoPix);

// Índices para otimização
TransacaoPixSchema.index({ lancamentoFinanceiro: 1 });
TransacaoPixSchema.index({ empresa: 1, status: 1 });
TransacaoPixSchema.index({ dataExpiracao: 1 });
TransacaoPixSchema.index({ chaveDestinatario: 1 });
TransacaoPixSchema.index({ createdAt: 1 });
