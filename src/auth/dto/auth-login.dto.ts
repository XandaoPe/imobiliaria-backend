// src/auth/dto/auth-login.dto.ts
import { IsString, IsNotEmpty, IsEmail } from 'class-validator';

export class AuthLoginDto {
    @IsEmail()
    email: string;

    @IsString()
    @IsNotEmpty()
    senha: string;

    // ⭐️ CRUCIAL: ID da Empresa para o login multitenant
    @IsString()
    @IsNotEmpty()
    empresaId: string;
}