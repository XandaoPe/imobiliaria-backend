// src/cliente/schemas/cliente.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ClienteDocument = Cliente & Document;

@Schema({ timestamps: true })
export class Cliente {
    @Prop({ required: true })
    nome: string;

    @Prop({ required: true, })
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
    observacoes: string; // Mongoose armazena null se o valor for nulo/omitido

    @Prop({ type: Types.ObjectId, ref: 'Empresa', required: true })
    empresa: Types.ObjectId;
}

// ⚠️ Adicionar um índice composto para CPF/Email + Empresa é crucial para o Multitenancy
// Você deve adicionar: ClienteSchema.index({ cpf: 1, empresa: 1 }, { unique: true });
// E similar para email, se quiser garantir a unicidade de CPF e Email por Empresa.

export const ClienteSchema = SchemaFactory.createForClass(Cliente);