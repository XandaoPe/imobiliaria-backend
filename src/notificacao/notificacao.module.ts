// src/notificacao/notificacao.module.ts
import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { NotificacaoService } from './notificacao.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { resolve } from 'path';

@Module({
    imports: [
        MailerModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                // ⭐️ Configuração do Transportador SMTP (usando variáveis de ambiente)
                transport: {
                    host: configService.get<string>('MAIL_TRANSPORT'),
                    port: configService.get<number>('MAIL_PORT'),
                    secure: false, // Use true se a porta for 465 (TLS/SSL)
                    auth: {
                        user: configService.get<string>('MAIL_USER'),
                        pass: configService.get<string>('MAIL_PASSWORD'),
                    },
                },
                defaults: {
                    // Define o remetente padrão (FROM)
                    from: configService.get<string>('MAIL_FROM'),
                },
                template: {
                    // ⭐️ Configuração do Handlebars para templates HTML
                    dir: resolve(__dirname, 'templates'), // Caminho para a pasta de templates
                    adapter: new HandlebarsAdapter(),
                    options: {
                        strict: true,
                    },
                },
            }),
        }),
    ],
    providers: [NotificacaoService],
    exports: [NotificacaoService], // Exportamos para ser usado em outros módulos
})
export class NotificacaoModule { }