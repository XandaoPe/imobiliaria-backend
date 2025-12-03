// src/contrato/contrato.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose'; // ⭐️ Necessário importar
import { ContratoService } from './contrato.service';
import { ContratoController } from './contrato.controller';
import { Contrato, ContratoSchema } from './schemas/contrato.schema'; // ⭐️ Necessário importar
import { AuthModule } from 'src/auth/auth.module';
import { ImovelModule } from 'src/imovel/imovel.module';
import { ClienteModule } from 'src/cliente/cliente.module';

@Module({
  imports: [
    // ⭐️ A LINHA CRUCIAL QUE CRIA E EXPOE O ContratoModel
    MongooseModule.forFeature([{ name: Contrato.name, schema: ContratoSchema }]),
    AuthModule,
    ImovelModule,
    ClienteModule
  ],
  controllers: [ContratoController],
  providers: [ContratoService],
  exports: [ContratoService]
})
export class ContratoModule { }