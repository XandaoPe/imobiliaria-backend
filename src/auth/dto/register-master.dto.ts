// src/auth/dto/register-master.dto.ts

import { IsString, IsNotEmpty, IsEmail, MinLength, IsBoolean, IsOptional, Matches } from 'class-validator';
import { CreateEmpresaDto } from 'src/empresa/dto/create-empresa.dto';

export class RegisterMasterDto extends CreateEmpresaDto {

    // ⭐️ CAMPO CNPJ REESCRITO: Inclui IsString, IsNotEmpty e Matches
    @IsString({ message: 'O CNPJ deve ser uma string.' })
    @IsNotEmpty({ message: 'O CNPJ é obrigatório.' })
    @Matches(/^\d{14}$/, { message: 'O CNPJ deve conter exatamente 14 dígitos numéricos.' })
    cnpj: string = "";

    // Campos do Usuário Master
    @IsString({ message: 'O nome completo deve ser uma string.' })
    @IsNotEmpty({ message: 'O nome completo do administrador é obrigatório.' })
    nomeCompleto: string;

    @IsEmail({}, { message: 'O email deve ser um endereço de email válido.' })
    @IsNotEmpty({ message: 'O email é obrigatório.' })
    email: string;

    @IsString({ message: 'A senha deve ser uma string.' })
    @IsNotEmpty({ message: 'A senha é obrigatória.' })
    @MinLength(6, { message: 'A senha deve ter no mínimo 6 caracteres.' })
    senha: string;
}