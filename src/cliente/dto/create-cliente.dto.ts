// src/cliente/dto/create-cliente.dto.ts
import { IsString, IsEmail, IsOptional, IsEnum } from 'class-validator';

export class CreateClienteDto {
    @IsString()
    nome: string;

    @IsString()
    cpf: string;

    @IsString()
    @IsOptional()
    telefone?: string;

    @IsEmail()
    email: string;

    @IsString()
    @IsOptional()
    @IsEnum(['ATIVO', 'INATIVO'])
    status?: string;

    @IsString()
    @IsOptional()
    perfil?: string;

    @IsString()
    @IsOptional()
    observacoes?: string;

    // ⭐️ ADICIONE ESTES CAMPOS ABAIXO
    @IsString()
    @IsOptional()
    endereco?: string;

    @IsString()
    @IsOptional()
    cidade?: string;
}