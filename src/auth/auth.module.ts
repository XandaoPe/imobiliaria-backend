// src/auth/auth.module.ts
import { InternalServerErrorException, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsuarioModule } from '../usuario/usuario.module';
import { LocalStrategy } from './strategies/local.strategy'; // Criaremos este
import { JwtStrategy } from './strategies/jwt.strategy'; // Criaremos este
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
    imports: [
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => {
                const secret = configService.get<string>('JWT_SECRET');
                if (!secret) {
                    // Lança erro se a chave secreta não estiver em .env ou ambiente
                    throw new InternalServerErrorException('JWT_SECRET must be defined');
                }
                return {
                    secret: secret, // Agora garantido como string
                    signOptions: { expiresIn: '60m' },
                };
            },
            inject: [ConfigService],
        }),

        PassportModule,
        UsuarioModule, // Necessário para buscar o usuário
        ConfigModule,
    ],
    controllers: [AuthController],
    providers: [AuthService, LocalStrategy, JwtStrategy], // Adiciona as estratégias de autenticação
    exports: [AuthService],
})
export class AuthModule { }