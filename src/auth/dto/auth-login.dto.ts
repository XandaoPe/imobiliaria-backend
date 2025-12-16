// src/auth/dto/auth-login.dto.ts
import { IsString, IsNotEmpty, IsEmail, IsOptional } from 'class-validator';

export class AuthLoginDto {
    @IsEmail()
    email: string;

    @IsString()
    @IsNotEmpty()
    senha: string;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    empresaId: string;
}