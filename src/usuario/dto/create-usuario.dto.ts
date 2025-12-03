// src/usuario/dto/create-usuario.dto.ts
import { IsString, IsNotEmpty, IsEmail, IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { PerfisEnum } from '../schemas/usuario.schema';

export class CreateUsuarioDto {
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @IsString()
    @IsNotEmpty()
    senha: string;

    @IsString()
    @IsNotEmpty()
    nome: string;

    // 🔑 ID da Empresa a qual o usuário pertence (Obrigatório na criação)
    @IsString()
    @IsNotEmpty()
    empresaId: string;

    @IsEnum(PerfisEnum, { message: 'O perfil deve ser um valor válido: ADM_GERAL, GERENTE, CORRETOR ou SUPORTE' })
    @IsOptional()
    perfil?: PerfisEnum;

    @IsBoolean()
    @IsOptional()
    ativo?: boolean;
}