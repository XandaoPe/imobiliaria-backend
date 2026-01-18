// src/configuracao/configuracao.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfiguracaoService } from './configuracao.service';
import { ConfiguracaoController } from './configuracao.controller';
import { Configuracao, ConfiguracaoSchema } from './schemas/configuracao.schema';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Configuracao.name, schema: ConfiguracaoSchema }
        ]),
        AuthModule,
    ],
    controllers: [ConfiguracaoController],
    providers: [ConfiguracaoService],
    exports: [ConfiguracaoService]
})
export class ConfiguracaoModule { }