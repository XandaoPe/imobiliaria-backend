// src/auth/auth.controller.ts

import { Controller, Post, Body, UseGuards, Request, UnauthorizedException, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthLoginDto } from './dto/auth-login.dto';
import { RegisterMasterDto } from './dto/register-master.dto'; // ⭐️ Importa DTO do registro
import { ApiOperation, ApiTags, ApiBody } from '@nestjs/swagger';

@ApiTags('Autenticação e Login')
@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @Post('login')
    @HttpCode(HttpStatus.OK) // Sucesso no login retorna 200
    @ApiOperation({ summary: 'Realiza o login do usuário com email, senha e ID da Empresa.' })
    async login(@Body() body: AuthLoginDto) {
        try {
            // 1. Valida o usuário (o Service lança UnauthorizedException em caso de falha)
            const usuario = await this.authService.validateUser(
                body.email,
                body.senha,
                body.empresaId
            );
            // 2. Retorna o Token JWT
            return this.authService.login(usuario);
        } catch (error) {
            // Captura a exceção UnauthorizedException lançada pelo service
            if (error instanceof UnauthorizedException) {
                throw error;
            }
            throw error; // Relança outros erros
        }
    }

    // ⭐️ NOVO ENDPOINT PÚBLICO: POST /auth/register-master
    @Post('register-master')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Cria Empresa e Usuário Administrador Master (Landing Page).' })
    @ApiBody({ type: RegisterMasterDto })
    async registerMaster(@Body() registerMasterDto: RegisterMasterDto): Promise<any> {
        return this.authService.registerMaster(registerMasterDto);
    }

    // Exemplo de rota protegida que usa o token JWT
    @Post('profile')
    @ApiOperation({ summary: 'Obtém as informações do perfil do usuário logado.' })
    @UseGuards(AuthGuard('jwt')) // Garante que apenas usuários autenticados acessem
    getProfile(@Request() req) {
        return req.user;
    }
}