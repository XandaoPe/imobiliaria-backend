// src/tasks/lembretes.task.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AgendamentoService } from '../agendamento/agendamento.service';

@Injectable()
export class LembretesTask {
    private readonly logger = new Logger(LembretesTask.name);

    constructor(private readonly agendamentoService: AgendamentoService) { }

    @Cron(CronExpression.EVERY_MINUTE)
    async enviarLembretesAgendamentos() {
        this.logger.log('Verificando lembretes de agendamentos...');

        try {
            await this.agendamentoService.enviarLembretes();
        } catch (error) {
            this.logger.error('Erro ao enviar lembretes:', error);
        }
    }
}