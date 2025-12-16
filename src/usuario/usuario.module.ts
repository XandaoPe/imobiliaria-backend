// src/usuario/usuario.module.ts (Ajuste assumido)

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Usuario, UsuarioSchema } from './schemas/usuario.schema';
import { UsuarioService } from './usuario.service';
import { UsuarioController } from './usuario.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Usuario.name, schema: UsuarioSchema }, // O ÚNICO LUGAR ONDE O SCHEMA É DEFINIDO
    ]),
  ],
  controllers: [UsuarioController],
  providers: [UsuarioService],
  // ⭐️ EXPORTAÇÃO CHAVE: Exporta o MongooseModule para que outros módulos (AuthModule) possam usar o Modelo
  exports: [UsuarioService, MongooseModule],
})
export class UsuarioModule { }