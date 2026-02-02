// src/empresa/schemas/empresa.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type EmpresaDocument = Empresa & Document;

// Interface para chave PIX da empresa
export interface ChavePixEmpresa {
    tipo: 'CNPJ' | 'EMAIL' | 'TELEFONE' | 'CHAVE_ALEATORIA';
    chave: string;
    preferencial: boolean;
    dataCadastro: string;
}

@Schema({ timestamps: true })
export class Empresa {
    @Prop({ required: true, unique: true })
    cnpj: string;

    @Prop({ required: true, unique: true })
    nome: string;

    @Prop()
    fone: string;

    @Prop()
    endereco: string; // ⭐️ Adicionado para o cabeçalho do PDF

    @Prop()
    logo: string; // ⭐️ URL da imagem da logomarca (Cloudinary/S3)

    @Prop()
    assinatura_url: string; // ⭐️ URL da imagem da assinatura digitalizada

    @Prop({ default: false }) // Mudado para false por padrão, exceto se for a dona do sistema
    isAdmGeral?: boolean;

    @Prop({ default: true })
    ativa?: boolean;

    // 🔑 NOVO: Campos para chave PIX da empresa
    @Prop({
        type: {
            tipo: {
                type: String,
                enum: ['CNPJ', 'EMAIL', 'TELEFONE', 'CHAVE_ALEATORIA'],
                default: 'CNPJ'
            },
            chave: { type: String, default: null },
            preferencial: { type: Boolean, default: true },
            dataCadastro: {
                type: String,
                default: function () {
                    return new Date().toISOString().split('T')[0];
                }
            }
        },
        _id: false
    })
    chavePix?: ChavePixEmpresa;

    @Prop({ type: [String], default: [] })
    chavesPixAlternativas?: string[];

    // 🔑 NOVO: Dados bancários para complemento
    @Prop()
    banco?: string;

    @Prop()
    agencia?: string;

    @Prop()
    conta?: string;

    @Prop()
    tipoConta?: string; // CORRENTE, POUPANÇA

}

export const EmpresaSchema = SchemaFactory.createForClass(Empresa);

EmpresaSchema.index({ 'chavePix.chave': 1 }, { sparse: true });
EmpresaSchema.index({ cnpj: 1 });
EmpresaSchema.index({ nome: 1 });