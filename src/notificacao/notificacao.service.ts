import { Injectable, InternalServerErrorException, OnModuleInit } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import * as admin from 'firebase-admin';
import * as path from 'path';
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

                const serviceAccountPath = path.resolve(process.cwd(), 'config', 'firebase-service-account.json');

                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccountPath),
                });
            }
        }
    }

    /**
     * Envia Notificação Push para um ou vários dispositivos
     */
    async sendPush(
        tokens: string | string[],
        title: string,
        body: string,
        data?: any
    ): Promise<{
        success: boolean;
        message: string;
        successCount?: number;
        failureCount?: number;
    }> { // <-- ATUALIZE O TIPO DE RETORNO AQUI
        const tokenArray = Array.isArray(tokens) ? tokens : [tokens];
        const uniqueTokens = [...new Set(tokenArray.filter(t => !!t && t.length > 10))];

        if (uniqueTokens.length === 0) {
            return {
                success: false,
                message: 'Nenhum token de push disponível.'
            };
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

            if (response.failureCount > 0) {
                response.responses.forEach((resp, idx) => {
                    if (!resp.success) {
                        console.error(`❌ Erro no token [${uniqueTokens[idx].substring(0, 10)}...]:`, resp.error?.code);
                    }
                });
            }

            return {
                success: response.successCount > 0,
                message: `${response.successCount} notificações enviadas com sucesso`,
                successCount: response.successCount,
                failureCount: response.failureCount
            };
        } catch (error: any) {
            console.error('❌ Erro crítico no Firebase:', error);
            return {
                success: false,
                message: 'Erro no Firebase: ' + error.message
            };
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

        } catch (error) {
            console.error('Erro ao enviar email:', error);
            throw new InternalServerErrorException('Falha no serviço de e-mail.');
        }
    }
}