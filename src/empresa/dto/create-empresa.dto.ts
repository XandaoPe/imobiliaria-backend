// src/empresa/dto/create-empresa.dto.ts
import { IsString, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';

export class CreateEmpresaDto {
    
    @IsString()
    @IsNotEmpty()
    cnpj: string;
    
    @IsString()
    @IsNotEmpty()
    nome: string;

    @IsString()
    @IsOptional()
    fone?: string;

    @IsBoolean()
    @IsOptional()
    isAdmGeral?: boolean;

    @IsBoolean()
    @IsOptional()
    ativa?: boolean;
}