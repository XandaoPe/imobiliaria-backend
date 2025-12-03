// src/contrato/schemas/contrato.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Empresa } from 'src/empresa/schemas/empresa.schema';
import { Usuario } from 'src/usuario/schemas/usuario.schema';
import { Imovel } from 'src/imovel/schemas/imovel.schema';
import { Cliente } from 'src/cliente/schemas/cliente.schema';

export type ContratoDocument = Contrato & Document;

export enum TipoContrato {
    VENDA = 'VENDA',
    LOCACAO = 'LOCACAO',
}

export enum StatusContrato {
    RASCUNHO = 'RASCUNHO',
    AGUARDANDO_ASSINATURA = 'AGUARDANDO_ASSINATURA',
    ASSINADO = 'ASSINADO',
    FINALIZADO = 'FINALIZADO',
    CANCELADO = 'CANCELADO',
}

@Schema({ timestamps: true })
export class Contrato {
    // ⭐️ CHAVE DE MULTITENANCY
    @Prop({ type: Types.ObjectId, ref: Empresa.name, required: true })
    empresa: Types.ObjectId;

    // ⭐️ VINCULOS
    @Prop({ type: Types.ObjectId, ref: Usuario.name, required: true })
    usuarioCorretor: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: Imovel.name, required: true })
    imovel: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: Cliente.name, required: true })
    cliente: Types.ObjectId;

    // ⭐️ DETALHES DO CONTRATO
    @Prop({ required: true, enum: TipoContrato })
    tipo: TipoContrato;

    @Prop({ required: true, type: Number })
    valorTotal: number;

    @Prop()
    observacoes?: string;

    @Prop({ required: true, enum: StatusContrato, default: StatusContrato.RASCUNHO })
    status: StatusContrato;
}

export const ContratoSchema = SchemaFactory.createForClass(Contrato);