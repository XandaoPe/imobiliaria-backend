// src/cliente/dto/create-cliente.dto.ts
import { IsString, IsNotEmpty, IsEmail, IsOptional, IsIn } from 'class-validator';

export class CreateClienteDto {
    @IsString()
    @IsNotEmpty()
    nome: string;

    @IsString()
    @IsNotEmpty()
    cpf: string;

    @IsString()
    @IsOptional()
    telefone?: string;

    @IsEmail()
    @IsNotEmpty()
    email: string;

    // ⭐️ CORREÇÃO 4: Adicionar Status (opcional, com padrão no Schema)
    @IsString()
    @IsOptional()
    @IsIn(['ATIVO', 'INATIVO'])
    status?: string;

    // ⭐️ CORREÇÃO 5: Adicionar Perfil (opcional)
    @IsString()
    @IsOptional()
    perfil?: string;

    // ⭐️ CORREÇÃO 6: Adicionar Observações (opcional)
    @IsString()
    @IsOptional()
    observacoes?: string;
}