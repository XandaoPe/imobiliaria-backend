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
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Realiza o login. Retorna lista de empresas se o ID não for fornecido.' })
    async login(@Body() body: AuthLoginDto) {
        try {
            const result = await this.authService.validateUser(
                body.email,
                body.senha,
                body.empresaId // Passa o ID, pode ser undefined/nulo na Etapa 1
            );

            // ⭐️ VERIFICAÇÃO CHAVE: Se o resultado pedir seleção, retorna a lista de empresas
            if (result.requiresSelection) {
                return {
                    requiresSelection: true,
                    empresas: result.empresas,
                    // Poderia retornar um token de sessão aqui para evitar re-enviar Email/Senha
                };
            }

            // Se não pedir seleção, retorna o Token JWT (Etapa 2 finalizada)
            return this.authService.login(result);
        } catch (error) {
            // ... (tratamento de erros permanece igual) ...
            if (error instanceof UnauthorizedException) {
                throw error;
            }
            throw error;
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