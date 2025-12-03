// src/relatorios/relatorios.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RelatoriosService } from './relatorios.service';
import { RelatoriosController } from './relatorios.controller';
import { AuthModule } from 'src/auth/auth.module';
// Importe o Schema de Agendamento
import { Agendamento, AgendamentoSchema } from 'src/agendamento/schemas/agendamento.schema';

@Module({
  imports: [
    // ⭐️ Adicionamos o Model de Agendamento para injeção no Service
    MongooseModule.forFeature([{ name: Agendamento.name, schema: AgendamentoSchema }]),
    AuthModule,
  ],
  controllers: [RelatoriosController],
  providers: [RelatoriosService]
})
export class RelatoriosModule { }