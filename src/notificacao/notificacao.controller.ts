// src/notificacao/notificacao.controller.ts - adicione:
import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { NotificacaoService } from './notificacao.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('notificacao')
export class NotificacaoController {
    constructor(private readonly notificacaoService: NotificacaoService) { }

    @Post('teste')
    @UseGuards(AuthGuard('jwt'))
    async testNotification(@Body() body: {
        token: string;
        title: string;
        body: string;
        data?: any
    }) {
        console.log('🔔 Recebendo teste de notificação:', body);

        const result = await this.notificacaoService.sendPush(
            body.token,
            body.title,
            body.body,
            body.data
        );

        return {
            success: true,
            message: 'Notificação enviada com sucesso',
            timestamp: new Date().toISOString()
        };
    }
}