// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
// ⭐️ IMPORT NECESSÁRIO 1: ServeStaticModule
import { ServeStaticModule } from '@nestjs/serve-static';
// ⭐️ IMPORT NECESSÁRIO 2: join do path
import { join } from 'path';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { EmpresaModule } from './empresa/empresa.module';
import { UsuarioModule } from './usuario/usuario.module';
import { AuthModule } from './auth/auth.module';
import { ClienteModule } from './cliente/cliente.module';
import { ImovelModule } from './imovel/imovel.module';
import { UploadModule } from './upload/upload.module';
import { AgendamentoModule } from './agendamento/agendamento.module';
import { ContratoModule } from './contrato/contrato.module';
import { RelatoriosModule } from './relatorios/relatorios.module';
import { NotificacaoModule } from './notificacao/notificacao.module';
import { LeadsModule } from './leads/leads.module';
import { NegociacaoModule } from './negociacao/negociacao.module';

@Module({
  imports: [
    // 1. Configura o módulo de configuração
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // 2. Configura a conexão com o MongoDB
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URI'),
      }),
      inject: [ConfigService],
    }),

    ServeStaticModule.forRoot({
      // Isso tenta achar a pasta uploads na raiz do projeto, independente de onde o arquivo rodar
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),

    // 4. Módulos da Aplicação
    EmpresaModule,
    UsuarioModule,
    AuthModule,
    ClienteModule,
    ImovelModule,
    UploadModule,
    AgendamentoModule,
    ContratoModule,
    RelatoriosModule,
    NotificacaoModule,
    LeadsModule,
    NegociacaoModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }