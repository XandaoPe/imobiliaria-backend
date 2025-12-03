// src/auth/strategies/local.strategy.ts
import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { AuthLoginDto } from '../dto/auth-login.dto'; // Criaremos este DTO

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
    constructor(private authService: AuthService) {
        super({
            // Define quais campos do Body serão usados para login
            usernameField: 'email',
            passwordField: 'senha',
        });
    }

    // O método `validate` é chamado ao fazer o POST para a rota de login
    async validate(email: string, senha: string): Promise<any> {
        // ⭐️ O `authService.validateUser` será implementado a seguir e fará a busca
        // do usuário por email E empresa, e a comparação da senha.
        const user = await this.authService.validateUser(email, senha);
        if (!user) {
            throw new UnauthorizedException('Credenciais inválidas ou Empresa/Usuário não encontrado.');
        }
        // Retorna o usuário (sem a senha)
        const { senha: _, ...result } = user;
        return result;
    }
}