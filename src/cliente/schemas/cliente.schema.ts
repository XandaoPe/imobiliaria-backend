// src/cliente/schemas/cliente.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ClienteDocument = Cliente & Document;

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

    // ⭐️ ADICIONADO: Registro no Schema do Banco
    @Prop()
    endereco: string;

    @Prop()
    cidade: string;

    @Prop({ type: Types.ObjectId, ref: 'Empresa', required: true })
    empresa: Types.ObjectId;
}

export const ClienteSchema = SchemaFactory.createForClass(Cliente);
