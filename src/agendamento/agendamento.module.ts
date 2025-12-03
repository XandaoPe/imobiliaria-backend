// src/agendamento/agendamento.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AgendamentoService } from './agendamento.service';
import { AgendamentoController } from './agendamento.controller';
import { Agendamento, AgendamentoSchema } from './schemas/agendamento.schema';
import { AuthModule } from 'src/auth/auth.module';
import { ImovelModule } from 'src/imovel/imovel.module';
import { ClienteModule } from 'src/cliente/cliente.module'; // ⭐️ Importar o ClienteModule
import { NotificacaoModule } from 'src/notificacao/notificacao.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Agendamento.name, schema: AgendamentoSchema }]),
    AuthModule,
    ImovelModule,
    ClienteModule, // ⭐️ ESTA LINHA DEVE ESTAR PRESENTE
    NotificacaoModule
  ],
  controllers: [AgendamentoController],
  providers: [AgendamentoService],
  exports: [AgendamentoService]
})
export class AgendamentoModule { }