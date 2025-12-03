// src/agendamento/schemas/agendamento.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Empresa } from 'src/empresa/schemas/empresa.schema';
import { Usuario } from 'src/usuario/schemas/usuario.schema';
import { Imovel } from 'src/imovel/schemas/imovel.schema';
import { Cliente } from 'src/cliente/schemas/cliente.schema';

export type AgendamentoDocument = Agendamento & Document;

export enum StatusAgendamento {
    PENDENTE = 'PENDENTE',
    CONFIRMADO = 'CONFIRMADO',
    CANCELADO = 'CANCELADO',
    REALIZADO = 'REALIZADO',
}

@Schema({ timestamps: true })
export class Agendamento {
    // ⭐️ CHAVE DE MULTITENANCY
    @Prop({ type: Types.ObjectId, ref: Empresa.name, required: true })
    empresa: Types.ObjectId;

    // ⭐️ O CORRETOR RESPONSÁVEL (QUEM CRIOU O AGENDAMENTO)
    @Prop({ type: Types.ObjectId, ref: Usuario.name, required: true })
    usuarioCorretor: Types.ObjectId;

    // ⭐️ O IMÓVEL PARA VISITA
    @Prop({ type: Types.ObjectId, ref: Imovel.name, required: true })
    imovel: Types.ObjectId;

    // ⭐️ O CLIENTE QUE FARÁ A VISITA
    @Prop({ type: Types.ObjectId, ref: Cliente.name, required: true })
    cliente: Types.ObjectId;

    // ⭐️ DATA E HORA DA VISITA
    @Prop({ required: true, type: Date })
    dataHora: Date;

    // ⭐️ STATUS DO AGENDAMENTO
    @Prop({ required: true, enum: StatusAgendamento, default: StatusAgendamento.PENDENTE })
    status: StatusAgendamento;
}

export const AgendamentoSchema = SchemaFactory.createForClass(Agendamento);

// Adicionamos um índice composto para garantir que não haja dois agendamentos
// em horários sobrepostos para o mesmo imóvel (ou corretor)
AgendamentoSchema.index({ dataHora: 1, imovel: 1, empresa: 1 }, { unique: true });