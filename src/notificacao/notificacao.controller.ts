// src/notificacao/notificacao.controller.ts - ATUALIZADO
import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { NotificacaoService } from './notificacao.service';
import { AuthGuard } from '@nestjs/passport';
import { ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Notificações')
@ApiBearerAuth('access-token')
@Controller('notificacao')
export class NotificacaoController {
    constructor(private readonly notificacaoService: NotificacaoService) { }

    @Post('teste')
    @UseGuards(AuthGuard('jwt'))
    @ApiOperation({ summary: 'Envia uma notificação push de teste' })
    async testNotification(@Body() body: {
        token: string;
        title: string;
        body: string;
        data?: any;
    }) {

        // O sendPush retorna void, então precisamos envolver em try/catch
        try {
            await this.notificacaoService.sendPush(
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
        } catch (error) {
            console.error('Erro ao enviar notificação:', error);
            return {
                success: false,
                message: 'Erro ao enviar notificação: ' + error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
}