// src/cliente/schemas/cliente.schema.ts (ATUALIZADO)
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ClienteDocument = Cliente & Document;

// Interface para a chave PIX do cliente
export interface ChavePixCliente {
    tipo: string;
    chave: string;
    validado: boolean;
    dataValidacao?: string;
    preferencial: boolean;
    dataCadastro: string;
}

@Schema({ timestamps: true })
export class Cliente {
    @Prop({ required: true })
    nome: string;

    @Prop({ required: true })
    cpf: string;

    @Prop()
    telefone: string;

    @Prop({ required: true })
    email: string;

    @Prop({ default: 'ATIVO', enum: ['ATIVO', 'INATIVO'] })
    status: string;

    @Prop({ default: 'Comprador/Vendedor' })
    perfil: string;

    @Prop()
    observacoes: string;

    @Prop()
    endereco: string;

    @Prop()
    cidade: string;

    @Prop({ type: Types.ObjectId, ref: 'Empresa', required: true })
    empresa: Types.ObjectId;

    // 🔑 NOVO: Campos para chave PIX
    @Prop({
        type: {
            tipo: {
                type: String,
                enum: ['CPF', 'CNPJ', 'EMAIL', 'TELEFONE', 'CHAVE_ALEATORIA'],
                default: null
            },
            chave: { type: String, default: null },
            validado: { type: Boolean, default: false },
            dataValidacao: {
                type: String,
                validate: {
                    validator: function (v: string) {
                        if (!v) return true;
                        return /^\d{4}-\d{2}-\d{2}$/.test(v);
                    },
                    message: 'dataValidacao deve estar no formato YYYY-MM-DD'
                }
            },
            preferencial: { type: Boolean, default: false },
            dataCadastro: {
                type: String,
                default: function () {
                    return new Date().toISOString().split('T')[0];
                }
            }
        },
        _id: false
    })
    chavePix?: ChavePixCliente;

    @Prop({ type: [String], default: [] })
    chavesPixAlternativas?: string[];

    @Prop({
        type: {
            ultimaTentativaValidacao: String,
            tentativas: { type: Number, default: 0 },
            bloqueadoAte: String
        },
        _id: false
    })
    pixValidacaoStatus?: {
        ultimaTentativaValidacao?: string;
        tentativas: number;
        bloqueadoAte?: string;
    };
}

export const ClienteSchema = SchemaFactory.createForClass(Cliente);

// Índices
ClienteSchema.index({ cpf: 1, empresa: 1 }, { unique: true, sparse: true });
ClienteSchema.index({ email: 1, empresa: 1 }, { unique: true, sparse: true });
ClienteSchema.index({ 'chavePix.chave': 1, empresa: 1 }, { sparse: true });
ClienteSchema.index({ 'chavePix.validado': 1 });
ClienteSchema.index({ nome: 1, empresa: 1 });