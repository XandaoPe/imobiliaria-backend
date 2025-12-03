// src/notificacao/notificacao.service.ts
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class NotificacaoService {
    constructor(private readonly mailerService: MailerService) { }

    /**
     * Envia um email baseado em template Handlebars.
     * @param to Destinatário.
     * @param subject Assunto do e-mail.
     * @param template Nome do arquivo template (ex: 'confirmacao').
     * @param context Dados para preencher o template.
     */
    async sendEmail(to: string, subject: string, template: string, context: any): Promise<void> {
        try {
            await this.mailerService.sendMail({
                to: to,
                subject: subject,
                template: template, // Nome do arquivo sem a extensão (.hbs)
                context: context, // Variáveis para o template
            });
            console.log(`Email enviado para: ${to} | Assunto: ${subject}`);
        } catch (error) {
            console.error('Erro ao enviar email:', error);
            throw new InternalServerErrorException('Falha no serviço de envio de e-mail.');
        }
    }
}