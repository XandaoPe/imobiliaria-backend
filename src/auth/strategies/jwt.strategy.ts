// src/auth/strategies/jwt.strategy.ts
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, InternalServerErrorException } from '@nestjs/common'; // Importar o InternalServerErrorException
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(configService: ConfigService) {

        // ⭐️ PASSO DE CORREÇÃO: Forçar a existência da chave secreta
        const jwtSecret = configService.get<string>('JWT_SECRET');

        if (!jwtSecret) {
            // Garantir que a aplicação não inicie se a chave secreta JWT estiver faltando
            throw new InternalServerErrorException('A chave secreta JWT (JWT_SECRET) não está configurada nas variáveis de ambiente.');
        }

        super({
            // Extrai o token do cabeçalho 'Authorization: Bearer <token>'
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false, // Não ignora a expiração do token
            // O TypeScript agora sabe que 'jwtSecret' é uma string
            secretOrKey: jwtSecret,
        });
    }

    async validate(payload: any) {
        return {
            userId: payload.sub,
            email: payload.email,
            perfil: payload.perfil,
            empresaId: payload.empresaId,
        };
    }
}