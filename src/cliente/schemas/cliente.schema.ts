// src/cliente/schemas/cliente.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Empresa } from '../../empresa/schemas/empresa.schema';

export type ClienteDocument = Cliente & Document;

@Schema({ timestamps: true })
export class Cliente {
    @Prop({ required: true })
    nome: string;

    @Prop({ required: true, unique: true })
    cpf: string; // Garantir unicidade do CPF

    @Prop()
    telefone: string;

    @Prop({ required: true, unique: true })
    email: string;

    // 🔑 CHAVE DO MULTITENANCY: Vincula o cliente a uma empresa
    @Prop({ type: Types.ObjectId, ref: 'Empresa', required: true })
    empresa: Types.ObjectId;
}

// ⚠️ Adicionar um índice composto para CPF/Email + Empresa é crucial para o Multitenancy
// A unicidade deve ser garantida DENTRO da empresa. Faremos isso no Module.

export const ClienteSchema = SchemaFactory.createForClass(Cliente);