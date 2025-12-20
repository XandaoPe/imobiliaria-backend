// src/empresa/schemas/empresa.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type EmpresaDocument = Empresa & Document;

@Schema({ timestamps: true }) // Adiciona campos createdAt e updatedAt
export class Empresa {
    @Prop({ required: true, unique: true })
    cnpj: string;
    
    @Prop({ required: true, unique: true })
    nome: string; // Ex: Nome da Imobiliária

    @Prop()
    fone: string;

    @Prop({ default: true })
    isAdmGeral?: boolean;

    @Prop({ default: true })
    ativa?: boolean;
}

export const EmpresaSchema = SchemaFactory.createForClass(Empresa);