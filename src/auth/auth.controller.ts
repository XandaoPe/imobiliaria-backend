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
    async login(@Body() body: AuthLoginDto & { pushToken?: string }) { // 👈 Adicionamos o pushToken aqui
        try {
            const result = await this.authService.validateUser(
                body.email,
                body.senha,
                body.empresaId
            );

            if (result.requiresSelection) {
                return {
                    requiresSelection: true,
                    empresas: result.empresas,
                };
            }

            // ⭐️ AGORA PASSAMOS O PUSHTOKEN PARA O SERVICE
            // O body.pushToken vem lá do seu componente de login no React/Vercel
            return this.authService.login(result, body.pushToken);
        } catch (error) {
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