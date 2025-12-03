// src/usuario/schemas/usuario.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Empresa } from '../../empresa/schemas/empresa.schema'; // Importa o Schema da Empresa

export type UsuarioDocument = Usuario & Document;

// Enum para simplificar a gestão de perfis
export enum PerfisEnum {
    ADM_GERAL = 'ADM_GERAL',
    GERENTE = 'GERENTE',
    CORRETOR = 'CORRETOR',
    SUPORTE = 'SUPORTE',
}

@Schema({ timestamps: true })
export class Usuario {
    @Prop({ required: true, unique: true })
    email: string;

    @Prop({ required: true })
    senha: string; // Armazenaremos o HASH aqui

    @Prop({ required: true })
    nome: string;

    // ⭐️ CHAVE DO MULTITENANCY: Vincula o usuário a uma empresa específica
    @Prop({ type: Types.ObjectId, ref: 'Empresa', required: true })
    empresa: Types.ObjectId;

    @Prop({ required: true, enum: PerfisEnum, default: PerfisEnum.CORRETOR })
    perfil: PerfisEnum;

    @Prop({ default: true })
    ativo: boolean;
}

export const UsuarioSchema = SchemaFactory.createForClass(Usuario);

// ⚠️ Adicionar um índice composto para garantir que emails sejam únicos POR EMPRESA
// Isso é crucial para o multitenancy e será implementado no módulo.