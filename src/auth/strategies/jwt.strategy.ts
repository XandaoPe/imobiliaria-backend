// src/auth/strategies/jwt.strategy.ts
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// ⭐️ Importar a nova interface
import { UsuarioPayload } from '../interfaces/usuario-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(configService: ConfigService) {
        const jwtSecret = configService.get<string>('JWT_SECRET');

        if (!jwtSecret) {
            throw new InternalServerErrorException('A chave secreta JWT (JWT_SECRET) não está configurada nas variáveis de ambiente.');
        }

        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: jwtSecret,
        });
    }

    // ⭐️ O validate AGORA retorna a interface tipada
    async validate(payload: any): Promise<UsuarioPayload> {
        // ⭐️ Ajuste: O nome 'empresaId' no token deve ser mapeado para 'empresa'
        return {
            userId: payload.sub,
            email: payload.email,
            perfil: payload.perfil,
            // ⭐️ Se o token tiver 'empresaId', mapeamos para 'empresa'
            empresa: payload.empresaId || payload.empresa,
        };
    }
}
// ⚠️ Não é mais necessário exportar UsuarioPayload daqui.