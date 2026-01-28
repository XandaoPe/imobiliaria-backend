// src/tasks/lembretes.task.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AgendamentoService } from '../agendamento/agendamento.service';

@Injectable()
export class LembretesTask {
    private readonly logger = new Logger(LembretesTask.name);

    constructor(private readonly agendamentoService: AgendamentoService) { }

    // Executa a cada 5 minutos
    @Cron(CronExpression.EVERY_5_MINUTES)
    async enviarLembretesAgendamentos() {
        this.logger.log('Iniciando envio de lembretes de agendamentos...');

        try {
            await this.agendamentoService.enviarLembretes();
            this.logger.log('Lembretes de agendamentos enviados com sucesso');
        } catch (error) {
            this.logger.error('Erro ao enviar lembretes:', error);
        }
    }
}