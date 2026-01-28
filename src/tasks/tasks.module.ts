// src/tasks/tasks.module.ts
import { Module } from '@nestjs/common';
import { AgendamentoModule } from '../agendamento/agendamento.module';
import { LembretesTask } from './lembretes.task';

@Module({
    imports: [AgendamentoModule],
    providers: [LembretesTask],
})
export class TasksModule { }