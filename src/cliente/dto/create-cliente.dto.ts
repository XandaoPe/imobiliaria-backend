// src/cliente/dto/create-cliente.dto.ts
import { IsString, IsNotEmpty, IsEmail, IsOptional } from 'class-validator';

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

    // O empresaId será injetado do Token, assim como no Imóvel.
}