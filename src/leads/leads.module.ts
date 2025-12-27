// src/leads/leads.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';
import { Lead, LeadSchema } from './schemas/lead.schema';
import { Usuario, UsuarioSchema } from 'src/usuario/schemas/usuario.schema'; // Importe o Schema de Usuário
import { NotificacaoModule } from 'src/notificacao/notificacao.module'; // Importe o Módulo de Notificação

@Module({
    imports: [
        // 1. Registra o Model de Leads
        MongooseModule.forFeature([{ name: Lead.name, schema: LeadSchema }]),

        // 2. Registra o Model de Usuário para que o LeadsService possa buscar corretores
        MongooseModule.forFeature([{ name: Usuario.name, schema: UsuarioSchema }]),

        // 3. Importa o módulo de notificações (onde está o seu NotificacaoService)
        NotificacaoModule
    ],
    controllers: [LeadsController],
    providers: [LeadsService],
    exports: [LeadsService]
})
export class LeadsModule { }