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
    ): Promise<{ success: boolean; message: string }> {
        const tokenArray = Array.isArray(tokens) ? tokens : [tokens];
        const uniqueTokens = [...new Set(tokenArray.filter(t => !!t && t.length > 10))];

        if (uniqueTokens.length === 0) {
            return { success: false, message: 'Nenhum token de push disponível.' };
        }

        try {
            const response = await admin.messaging().sendEachForMulticast({
                tokens: uniqueTokens,
                notification: { title, body },
                data: data || {},
                webpush: {
                    notification: {
                        title,
                        body,
                        icon: 'https://imobiliaria-frontend-six.vercel.app/logo192.png',
                        badge: 'https://imobiliaria-frontend-six.vercel.app/logo192.png',
                        tag: 'lead-notification',
                        renotify: true
                    },
                    fcmOptions: {
                        link: 'https://imobiliaria-frontend-six.vercel.app/leads'
                    }
                },
            });

            console.log(`🚀 Push processado: ${response.successCount} sucessos, ${response.failureCount} falhas.`);

            if (response.failureCount > 0) {
                response.responses.forEach((resp, idx) => {
                    if (!resp.success) {
                        console.error(`❌ Erro no token [${uniqueTokens[idx].substring(0, 10)}...]:`, resp.error?.code);
                    }
                });
            }

            return {
                success: response.successCount > 0,
                message: `${response.successCount} notificações enviadas com sucesso`
            };
        } catch (error) {
            console.error('❌ Erro crítico no Firebase:', error);
            return { success: false, message: 'Erro no Firebase: ' + error.message };
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