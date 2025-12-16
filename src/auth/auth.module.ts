// src/auth/auth.module.ts

import { InternalServerErrorException, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsuarioModule } from '../usuario/usuario.module';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { ConfigModule, ConfigService } from '@nestjs/config';
// ⭐️ NOVAS IMPORTAÇÕES DE MODELOS PARA O REGISTRO MESTRE
import { MongooseModule } from '@nestjs/mongoose';
import { Empresa, EmpresaSchema } from 'src/empresa/schemas/empresa.schema';
import { Usuario, UsuarioSchema } from 'src/usuario/schemas/usuario.schema';

@Module({
    imports: [
        // ⭐️ AJUSTE CRUCIAL: Removemos o carregamento duplicado do Usuario!
        MongooseModule.forFeature([
            // ⚠️ REMOVIDO: { name: Usuario.name, schema: UsuarioSchema },
            { name: Empresa.name, schema: EmpresaSchema }, // MANTÉM, pois o AuthModule é o único que o carrega aqui
        ]),

        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => {
                const secret = configService.get<string>('JWT_SECRET');
                if (!secret) {
                    throw new InternalServerErrorException('JWT_SECRET must be defined');
                }
                return {
                    secret: secret,
                    signOptions: { expiresIn: '720m' },
                };
            },
            inject: [ConfigService],
        }),

        PassportModule,
        UsuarioModule, // Continua importando para usar o UsuarioService e o UsuarioModel exportado
        ConfigModule,
    ],
    controllers: [AuthController],
    providers: [AuthService, LocalStrategy, JwtStrategy],
    exports: [AuthService],
})
export class AuthModule { }