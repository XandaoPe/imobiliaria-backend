// src/usuario/usuario.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsuarioService } from './usuario.service';
import { UsuarioController } from './usuario.controller';
import { Usuario, UsuarioSchema } from './schemas/usuario.schema';
import { EmpresaModule } from '../empresa/empresa.module'; // Importa o módulo Empresa

@Module({
  imports: [
    MongooseModule.forFeatureAsync([
      {
        name: Usuario.name,
        useFactory: () => {
          const schema = UsuarioSchema;
          // Adiciona o índice composto: email deve ser único DENTRO de cada empresa
          schema.index({ email: 1, empresa: 1 }, { unique: true });
          return schema;
        },
      },
    ]),
    EmpresaModule, // Permite que o Serviço de Usuário use o Serviço de Empresa
  ],
  controllers: [UsuarioController],
  providers: [UsuarioService],
  exports: [UsuarioService], // Exportamos para o futuro Módulo Auth
})
export class UsuarioModule { }