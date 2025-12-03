// src/empresa/dto/create-empresa.dto.ts
import { IsString, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';

export class CreateEmpresaDto {
    @IsString()
    @IsNotEmpty()
    nome: string;

    @IsString()
    @IsNotEmpty()
    cnpj: string;

    @IsBoolean()
    @IsOptional()
    isAdmGeral?: boolean;

    @IsBoolean()
    @IsOptional()
    ativa?: boolean;
}