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
        // 1. Normaliza para sempre ser um Array e remove valores vazios
        const tokenArray = Array.isArray(tokens) ? tokens : [tokens];
        const validTokens = tokenArray.filter(t => !!t && t !== "");

        if (validTokens.length === 0) return;

        try {
            // 2. Usamos sendEachForMulticast para enviar para o array de tokens
            const response = await admin.messaging().sendEachForMulticast({
                tokens: validTokens, // Agora o TS aceita, pois este método espera 'tokens'
                notification: { title, body },
                data: data || {},
                webpush: {
                    notification: {
                        icon: '/logo192.png',
                        badge: '/logo192.png',
                        // Substitua pela URL real do seu front na Vercel
                    },
                    fcmOptions: {
                        link: 'https://seu-front.vercel.app/leads'
                    }
                },
                android: { priority: 'high' },
                apns: { payload: { aps: { sound: 'default' } } }
            });

            console.log(`✅ Push processado: ${response.successCount} sucessos, ${response.failureCount} falhas.`);

            // Dica: Se quiser limpar tokens inválidos do banco, você analisaria response.responses aqui
        } catch (error) {
            console.error('❌ Erro crítico ao enviar push multicast:', error);
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