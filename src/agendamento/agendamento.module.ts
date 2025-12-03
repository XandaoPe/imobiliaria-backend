// src/agendamento/agendamento.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AgendamentoService } from './agendamento.service';
import { AgendamentoController } from './agendamento.controller';
import { Agendamento, AgendamentoSchema } from './schemas/agendamento.schema';
import { AuthModule } from 'src/auth/auth.module'; // Para Guards
import { ImovelModule } from 'src/imovel/imovel.module'; // Para buscar o Imóvel
import { ClienteModule } from 'src/cliente/cliente.module'; // Para buscar o Cliente

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Agendamento.name, schema: AgendamentoSchema }]),
    // Importamos as dependências para uso futuro no service
    AuthModule,
    ImovelModule,
    ClienteModule
  ],
  controllers: [AgendamentoController],
  providers: [AgendamentoService],
  exports: [AgendamentoService]
})
export class AgendamentoModule { }