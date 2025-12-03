// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
// Importe o módulo Empresa que criaremos depois
import { EmpresaModule } from './empresa/empresa.module';
import { UsuarioModule } from './usuario/usuario.module';
import { AuthModule } from './auth/auth.module';
import { ClienteModule } from './cliente/cliente.module';
import { ImovelModule } from './imovel/imovel.module';

@Module({
  imports: [
    // 1. Configura o módulo de configuração
    ConfigModule.forRoot({
      isGlobal: true, // Torna as variáveis de ambiente disponíveis globalmente
    }),

    // 2. Configura a conexão com o MongoDB
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URI'),
      }),
      inject: [ConfigService],
    }),

    EmpresaModule,
    UsuarioModule,
    AuthModule,
    ClienteModule,
    ImovelModule, // Adiciona o módulo Empresa
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }