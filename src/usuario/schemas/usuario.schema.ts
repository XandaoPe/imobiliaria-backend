// src/usuario/schemas/usuario.schema.ts (ATUALIZADO)
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Empresa } from '../../empresa/schemas/empresa.schema';

export type UsuarioDocument = Usuario & Document;

export enum PerfisEnum {
    ADM_GERAL = 'ADM_GERAL',
    GERENTE = 'GERENTE',
    CORRETOR = 'CORRETOR',
    SUPORTE = 'SUPORTE',
}

export enum NivelUsuario {
    JUNIOR = 'JUNIOR',
    PLENO = 'PLENO',
    SENIOR = 'SENIOR',
    ESPECIAL = 'ESPECIAL',
}

// Interface para a chave PIX
export interface ChavePixUsuario {
    tipo: string;
    chave: string;
    validado: boolean;
    dataValidacao?: string;
    preferencial: boolean;
    dataCadastro: string;
}

@Schema({ timestamps: true })
export class Usuario {

    @Prop({ required: true })
    email: string;

    @Prop({ required: true })
    senha: string;

    @Prop({ required: true })
    nome: string;

    @Prop({ type: Types.ObjectId, ref: 'Empresa', required: true })
    empresa: Types.ObjectId | Empresa | string;

    @Prop({ required: true, enum: PerfisEnum, default: PerfisEnum.CORRETOR })
    perfil: PerfisEnum;

    @Prop({ default: true })
    ativo: boolean;

    @Prop({ type: [String], default: [] })
    pushToken: string[];

    @Prop({
        enum: NivelUsuario,
        default: NivelUsuario.JUNIOR
    })
    nivel?: NivelUsuario;

    @Prop({ default: 0 })
    percentualComissaoPadrao?: number;

    @Prop({ default: 0 })
    metaMensal?: number;

    @Prop({ default: 0 })
    comissaoAcumulada: number;

    @Prop({
        type: String,
        validate: {
            validator: function (v: string) {
                if (!v) return true;
                return /^\d{4}-\d{2}-\d{2}$/.test(v);
            },
            message: 'dataAdmissao deve estar no formato YYYY-MM-DD'
        }
    })
    dataAdmissao?: string;

    @Prop({ default: true })
    ativoFinanceiro: boolean;

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
    chavePix?: ChavePixUsuario;

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

export const UsuarioSchema = SchemaFactory.createForClass(Usuario);

// Índices
UsuarioSchema.index({ email: 1, empresa: 1 }, { unique: true });
UsuarioSchema.index({ empresa: 1, perfil: 1, ativoFinanceiro: 1 });
UsuarioSchema.index({ 'chavePix.chave': 1, empresa: 1 }, { sparse: true });
UsuarioSchema.index({ 'chavePix.validado': 1 });

// Configuração de Serialização (toJSON)
UsuarioSchema.set('toJSON', {
    virtuals: true,
    transform: (doc, ret) => {
        const transformed = ret as Record<string, any>;

        if (transformed._id) {
            transformed.id = transformed._id.toString();
        }

        if (transformed.empresa && transformed.empresa instanceof Types.ObjectId) {
            transformed.empresa = transformed.empresa.toString();
        }

        // Remove campos sensíveis
        delete transformed._id;
        delete transformed.__v;
        delete transformed.senha;
        delete transformed.pixValidacaoStatus; // Não expor status interno de validação

        return transformed;
    },
});