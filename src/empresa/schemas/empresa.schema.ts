// src/empresa/schemas/empresa.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type EmpresaDocument = Empresa & Document;

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
}

export const EmpresaSchema = SchemaFactory.createForClass(Empresa);