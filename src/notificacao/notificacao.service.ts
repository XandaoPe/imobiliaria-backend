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
    /**
     * NOVO: Envia Notificação Push para um ou vários dispositivos
     */
    async sendPush(
        tokens: string | string[],
        title: string,
        body: string,
        data?: any
    ): Promise<void> {
        // Normaliza tokens: remove nulos, vazios e garante que é um array único
        const tokenArray = Array.isArray(tokens) ? tokens : [tokens];
        const validTokens = [...new Set(tokenArray.filter(t => !!t))];

        if (validTokens.length === 0) return;

        try {
            const response = await admin.messaging().sendEachForMulticast({
                tokens: validTokens,
                notification: { title, body },
                data: data || {},
                webpush: {
                    notification: {
                        icon: 'https://seu-front.vercel.app/logo192.png',
                        badge: 'https://seu-front.vercel.app/logo192.png',
                    },
                    fcmOptions: { link: 'https://seu-front.vercel.app/leads' }
                },
            });

            console.log(`🚀 Push: ${response.successCount} enviados, ${response.failureCount} falhas.`);

            // Dica: Aqui você poderia remover tokens que retornaram erro 'messaging/registration-token-not-registered'
        } catch (error) {
            console.error('❌ Erro no Firebase Multicast:', error);
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