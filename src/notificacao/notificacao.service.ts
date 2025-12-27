// src/notificacao/notificacao.service.ts
import { Injectable, InternalServerErrorException, OnModuleInit } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import * as admin from 'firebase-admin';
import * as path from 'path'; // Adicione este import
import { join } from 'path';

@Injectable()
export class NotificacaoService implements OnModuleInit {
    constructor(private readonly mailerService: MailerService) { }

    onModuleInit() {
        if (admin.apps.length === 0) {
            // 1. Verifica se temos as variáveis de ambiente (Cenário Nuvem/Render)
            const projectId = process.env.FIREBASE_PROJECT_ID;
            const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
            const privateKey = process.env.FIREBASE_PRIVATE_KEY;

            if (projectId && clientEmail && privateKey) {
                console.log('✅ Inicializando Firebase via Variáveis de Ambiente');
                admin.initializeApp({
                    credential: admin.credential.cert({
                        projectId,
                        clientEmail,
                        // Importante: corrige as quebras de linha da chave privada
                        privateKey: privateKey.replace(/\\n/g, '\n'),
                    }),
                });
            } else {
                // 2. Fallback para arquivo local (Cenário Desenvolvimento Local)
                console.log('ℹ️ Inicializando Firebase via arquivo JSON local');
                const serviceAccountPath = path.resolve(process.cwd(), 'config', 'firebase-service-account.json');

                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccountPath),
                });
            }
        }
    }

    /**
     * NOVO: Envia Notificação Push via Firebase Cloud Messaging
     */
    async sendPush(token: string, title: string, body: string, data?: any): Promise<void> {
        if (!token) return;

        try {
            await admin.messaging().send({
                notification: { title, body },
                token: token,
                data: data || {},
                // Adicione isto para melhor suporte a navegadores (Web Push)
                webpush: {
                    notification: {
                        icon: '/logo192.png', // Substitua pelo seu ícone
                        badge: '/logo192.png',
                        click_action: 'https://seu-front.vercel.app/leads' // URL para onde o usuário vai ao clicar
                    },
                    fcmOptions: {
                        link: 'https://seu-front.vercel.app/leads'
                    }
                },
                android: { priority: 'high' },
                apns: { payload: { aps: { sound: 'default' } } }
            });
            console.log(`Push enviado com sucesso.`);
        } catch (error) {
            console.error('Erro ao enviar push:', error);
        }
    }

    /**
     * SEU MÉTODO EXISTENTE: Envia e-mail
     */
    async sendEmail(to: string, subject: string, template: string, context: any): Promise<void> {
        try {
            await this.mailerService.sendMail({
                to,
                subject,
                template,
                context,
            });
            console.log(`Email enviado para: ${to}`);
        } catch (error) {
            console.error('Erro ao enviar email:', error);
            throw new InternalServerErrorException('Falha no serviço de e-mail.');
        }
    }
}