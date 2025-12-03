// src/auth/auth.controller.ts
import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthLoginDto } from './dto/auth-login.dto';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Autenticação e Login')
@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @Post('login')
    @ApiOperation({ summary: 'Realiza o login do usuário com email, senha e ID da Empresa.' })
    async login(@Body() body: AuthLoginDto) {
        // 1. Valida o usuário (verifica email, empresaId e senha)
        const usuario = await this.authService.validateUser(
            body.email,
            body.senha,
            body.empresaId
        );

        if (!usuario) {
            // Se a validação falhar, o validateUser lança a UnauthorizedException
            // ou podemos lançar aqui para o caso de retorno nulo
            // Porém, o validateUser já trata o erro (ajustei para lançar no service)
            return null;
        }

        // 2. Retorna o Token JWT
        return this.authService.login(usuario);
    }

    // Exemplo de rota protegida que usa o token JWT
    @Post('profile')
    @ApiOperation({ summary: 'Obtém as informações do perfil do usuário logado.' })
    @UseGuards(AuthGuard('jwt')) // Garante que apenas usuários autenticados acessem
    getProfile(@Request() req) {
        // O objeto 'req.user' contém o que foi retornado no JwtStrategy.validate()
        return req.user;
    }
}