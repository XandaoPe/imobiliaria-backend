// src/agendamento/agendamento.service.ts
import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Agendamento, AgendamentoDocument } from './schemas/agendamento.schema';
import { CreateAgendamentoDto } from './dto/create-agendamento.dto';
import { UpdateAgendamentoDto } from './dto/update-agendamento.dto';
import { ImovelService } from 'src/imovel/imovel.service';
import { ClienteService } from 'src/cliente/cliente.service';
import { UsuarioPayload } from 'src/auth/interfaces/usuario-payload.interface';
import { NotificacaoService } from 'src/notificacao/notificacao.service';
import { Usuario } from 'src/usuario/schemas/usuario.schema';

// Tipo para agendamento com campos básicos
type AgendamentoBasico = {
    _id: Types.ObjectId;
    empresa: Types.ObjectId;
    dataHora: Date;
    [key: string]: any;
};

@Injectable()
export class AgendamentoService {
    private readonly logger = new Logger(AgendamentoService.name);

    constructor(
        @InjectModel(Agendamento.name) private readonly agendamentoModel: Model<AgendamentoDocument>,
        @InjectModel(Usuario.name) private readonly usuarioModel: Model<Usuario>,

        private readonly clienteService: ClienteService,
        private readonly imovelService: ImovelService,
        private readonly notificacaoService: NotificacaoService,
    ) { }

    private async notificarNovoAgendamento(agendamento: AgendamentoBasico, criador: UsuarioPayload): Promise<void> {
        try {
            // Busca todos os usuários da empresa (exceto o criador)
            const usuarios = await this.usuarioModel.find({
                empresa: new Types.ObjectId(agendamento.empresa),
                _id: { $ne: new Types.ObjectId(criador.userId) }, // Não notifica quem criou
                pushToken: { $exists: true, $not: { $size: 0 } },
                perfil: { $in: ['CORRETOR', 'GERENTE', 'ADM_GERAL'] }
            }).exec();

            // Coleta todos os tokens únicos
            const todosTokens: string[] = [];
            usuarios.forEach(usuario => {
                if (usuario.pushToken && Array.isArray(usuario.pushToken)) {
                    usuario.pushToken.forEach(token => {
                        if (token && token.length > 10) {
                            todosTokens.push(token);
                        }
                    });
                }
            });

            const tokensUnicos = [...new Set(todosTokens)];

            if (tokensUnicos.length === 0) return;

            // Formatar data para exibição
            const dataFormatada = new Date(agendamento.dataHora).toLocaleDateString('pt-BR');
            const horaFormatada = new Date(agendamento.dataHora).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit'
            });

            // Envia notificação
            await this.notificacaoService.sendPush(
                tokensUnicos,
                "📅 NOVO AGENDAMENTO CRIADO!",
                `${criador.nome} agendou visita para ${dataFormatada} às ${horaFormatada}`,
                {
                    agendamentoId: agendamento._id.toString(),
                    empresaId: agendamento.empresa.toString(),
                    url: '/agendamentos',
                    type: 'new_agendamento',
                    criador: criador.nome
                }
            );

            console.log(`📅 Notificação enviada para ${tokensUnicos.length} usuários sobre novo agendamento`);
        } catch (error) {
            console.error('❌ Erro ao notificar novo agendamento:', error);
            // Não lança erro para não quebrar o fluxo de criação
        }
    }

    async create(createAgendamentoDto: CreateAgendamentoDto, user: UsuarioPayload): Promise<Agendamento> {
        const empresaId = new Types.ObjectId(user.empresa);
        const dataParaAgendar = new Date(createAgendamentoDto.dataHora);

        if (dataParaAgendar < new Date()) {
            throw new BadRequestException('Não é possível agendar visitas em datas passadas.');
        }

        await this.imovelService.findOne(createAgendamentoDto.imovelId, user.empresa);
        await this.clienteService.findOne(createAgendamentoDto.clienteId, user.empresa);

        dataParaAgendar.setSeconds(0, 0);
        dataParaAgendar.setMilliseconds(0);

        // Validação de conflito do CORRETOR (Você já tem essa lógica)
        const conflitoCorretor = await this.findByDateAndUser(dataParaAgendar.toISOString(), user.userId!);
        if (conflitoCorretor) {
            throw new BadRequestException('Você já possui um agendamento neste horário.');
        }

        try {
            const createdAgendamento = new this.agendamentoModel({
                ...createAgendamentoDto,
                empresa: empresaId,
                usuarioCorretor: new Types.ObjectId(user.userId),
                imovel: new Types.ObjectId(createAgendamentoDto.imovelId),
                cliente: new Types.ObjectId(createAgendamentoDto.clienteId),
                dataHora: dataParaAgendar,
                status: 'PENDENTE',
                lembreteEnviado: false, // ⭐️ Inicia como false
                dataLembreteEnviado: null
            });

            const agendamentoSalvo = await createdAgendamento.save();

            // ⭐️ DISPARAR NOTIFICAÇÃO APÓS SALVAR - Convertendo para tipo básico
            const agendamentoBasico: AgendamentoBasico = {
                _id: agendamentoSalvo._id,
                empresa: agendamentoSalvo.empresa,
                dataHora: agendamentoSalvo.dataHora
            };

            await this.notificarNovoAgendamento(agendamentoBasico, user);

            return agendamentoSalvo;

        } catch (error) {
            // ⭐️ TRATAMENTO DO ERRO DE CHAVE DUPLICADA (E11000)
            if (error.code === 11000) {
                throw new BadRequestException('Este imóvel já possui uma visita agendada para este horário por outro corretor.');
            }
            throw error; // Lança outros erros desconhecidos
        }
    }

    async findAll(user: UsuarioPayload): Promise<Agendamento[]> {
        const agora = new Date();
        const empresaId = new Types.ObjectId(user.empresa);

        const query: any = { empresa: empresaId };

        if (user.perfil === 'CORRETOR') {
            query.usuarioCorretor = new Types.ObjectId(user.userId);
        }

        await this.agendamentoModel.updateMany(
            {
                ...query,
                status: 'PENDENTE',
                dataHora: { $lt: agora }
            },
            { $set: { status: 'CONCLUIDO' } }
        );

        // Retorna os agendamentos sem modificar o tipo de dataHora
        return this.agendamentoModel.find(query)
            .populate('imovel cliente usuarioCorretor')
            .sort({ dataHora: 1 })
            .exec();
    }

    async findByDateAndUser(dataHora: string, usuarioId: string): Promise<Agendamento | null> {
        const dataBusca = new Date(dataHora);
        dataBusca.setSeconds(0, 0);
        dataBusca.setMilliseconds(0);

        return this.agendamentoModel.findOne({
            usuarioCorretor: new Types.ObjectId(usuarioId),
            dataHora: dataBusca,
            status: 'PENDENTE' // ⭐️ SÓ BLOQUEIA SE ESTIVER PENDENTE
        }).exec();
    }

    async findHorariosOcupadosParaImovel(imovelId: string, data: string): Promise<string[]> {
        const inicioDia = new Date(data);
        inicioDia.setUTCHours(0, 0, 0, 0);

        const fimDia = new Date(data);
        fimDia.setUTCHours(23, 59, 59, 999);

        const agendamentos = await this.agendamentoModel.find({
            imovel: new Types.ObjectId(imovelId),
            dataHora: { $gte: inicioDia, $lte: fimDia },
            status: { $in: ['PENDENTE', 'CONFIRMADO'] }
        }).select('dataHora').exec();

        return agendamentos.map(a => {
            const d = new Date(a.dataHora);
            // Converter para horário de São Paulo para exibição
            const horaSP = d.toLocaleString('pt-BR', {
                timeZone: 'America/Sao_Paulo',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
            return horaSP;
        });
    }

    async updateStatus(id: string, status: string, motivo: string, user: UsuarioPayload): Promise<Agendamento> {
        const query: any = { _id: id, empresa: new Types.ObjectId(user.empresa) };

        if (user.perfil === 'CORRETOR') {
            query.usuarioCorretor = new Types.ObjectId(user.userId);
        }

        const agendamento = await this.agendamentoModel.findOneAndUpdate(
            query,
            {
                $set: {
                    status: status,
                    observacoes: motivo
                }
            },
            { new: true }
        ).populate('usuarioCorretor').exec();

        if (!agendamento) throw new NotFoundException('Agendamento não encontrado ou sem permissão.');

        // ⭐️ NOTIFICAR MUDANÇA DE STATUS
        await this.notificarMudancaStatus(agendamento as any, status, motivo, user);

        return agendamento;
    }

    private async notificarMudancaStatus(agendamento: any, novoStatus: string, motivo: string, usuarioAlteracao: UsuarioPayload): Promise<void> {
        try {
            // Notifica apenas o corretor responsável
            const corretor = agendamento.usuarioCorretor;
            if (!corretor || !corretor.pushToken) return;

            const tokens = Array.isArray(corretor.pushToken)
                ? corretor.pushToken.filter((t: string) => t && t.length > 10)
                : [];

            if (tokens.length === 0) return;

            const dataFormatada = new Date(agendamento.dataHora).toLocaleDateString('pt-BR');
            const horaFormatada = new Date(agendamento.dataHora).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit'
            });

            let mensagem = '';
            let titulo = '';

            switch (novoStatus) {
                case 'CONFIRMADO':
                    titulo = '✅ AGENDAMENTO CONFIRMADO';
                    mensagem = `Sua visita para ${dataFormatada} às ${horaFormatada} foi confirmada`;
                    break;
                case 'CANCELADO':
                    titulo = '❌ AGENDAMENTO CANCELADO';
                    mensagem = `Visita para ${dataFormatada} às ${horaFormatada} foi cancelada`;
                    if (motivo) mensagem += ` (Motivo: ${motivo})`;
                    break;
                case 'REALIZADO':
                    titulo = '🏁 VISITA REALIZADA';
                    mensagem = `Visita para ${dataFormatada} às ${horaFormatada} marcada como realizada`;
                    break;
                default:
                    return;
            }

            await this.notificacaoService.sendPush(
                tokens,
                titulo,
                mensagem,
                {
                    agendamentoId: agendamento._id.toString(),
                    empresaId: agendamento.empresa.toString(),
                    url: '/agendamentos',
                    type: 'status_agendamento',
                    novoStatus: novoStatus
                }
            );

            console.log(`📅 Notificação de status enviada para corretor ${corretor.nome}`);
        } catch (error) {
            console.error('❌ Erro ao notificar mudança de status:', error);
        }
    }

    async findOne(agendamentoId: string, empresaId: string): Promise<Agendamento> {
        const agendamento = await this.agendamentoModel
            .findOne({ _id: agendamentoId, empresa: new Types.ObjectId(empresaId) })
            .populate('imovel cliente usuarioCorretor')
            .exec();

        if (!agendamento) throw new NotFoundException('Agendamento não encontrado.');
        return agendamento;
    }

    async update(agendamentoId: string, updateAgendamentoDto: UpdateAgendamentoDto, user: UsuarioPayload): Promise<Agendamento> {
        const query: any = { _id: agendamentoId, empresa: new Types.ObjectId(user.empresa) };

        if (user.perfil === 'CORRETOR') {
            query.usuarioCorretor = new Types.ObjectId(user.userId);
        }

        try {
            const updated = await this.agendamentoModel
                .findOneAndUpdate(query, updateAgendamentoDto, { new: true })
                .populate('imovel cliente')
                .exec();

            if (!updated) throw new NotFoundException('Agendamento não encontrado ou sem permissão.');
            return updated;
        } catch (error) {
            // ⭐️ TRATAMENTO TAMBÉM NO UPDATE
            if (error.code === 11000) {
                throw new BadRequestException('Não foi possível alterar: o imóvel já possui agendamento neste novo horário.');
            }
            throw error;
        }
    }

    async remove(agendamentoId: string, empresaId: string): Promise<{ message: string }> {
        const result = await this.agendamentoModel.deleteOne({
            _id: agendamentoId,
            empresa: new Types.ObjectId(empresaId)
        }).exec();

        if (result.deletedCount === 0) throw new NotFoundException('Agendamento não encontrado.');
        return { message: 'Removido com sucesso.' };
    }

    // src/agendamento/agendamento.service.ts
    async enviarLembretes(): Promise<void> {
        try {
            const agora = new Date();

            // Define janela de 59-61 minutos no futuro
            const umaHoraUmMinutoDepois = new Date(agora.getTime() + 61 * 60 * 1000);
            const umaHoraUmMinutoAntes = new Date(agora.getTime() + 59 * 60 * 1000);

            // Busca agendamentos
            const agendamentosProximos = await this.agendamentoModel.find({
                status: 'PENDENTE',
                dataHora: {
                    $gte: umaHoraUmMinutoAntes,
                    $lte: umaHoraUmMinutoDepois
                },
                lembreteEnviado: false
            })
                .populate('usuarioCorretor', 'nome pushToken')
                .populate('imovel', 'titulo')
                .lean()
                .exec();

            this.logger.log(`Encontrados ${agendamentosProximos.length} agendamentos para lembrete`);

            for (const agendamento of agendamentosProximos as any[]) {
                const corretor = agendamento.usuarioCorretor;
                const imovel = agendamento.imovel;

                if (!corretor || !imovel) {
                    this.logger.warn('Agendamento sem corretor ou imóvel:', agendamento._id);
                    continue;
                }

                // Extrai tokens
                let tokens: string[] = [];
                const pushToken = corretor.pushToken;

                if (pushToken) {
                    if (Array.isArray(pushToken)) {
                        tokens = pushToken.filter((t: string) => t && t.length > 10);
                    } else if (typeof pushToken === 'string' && pushToken.length > 10) {
                        tokens = [pushToken];
                    }
                }

                if (tokens.length === 0) {
                    this.logger.warn(`Corretor ${corretor.nome} não tem tokens de push válidos`);
                    continue;
                }

                // Formata hora
                const horaFormatada = new Date(agendamento.dataHora).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: 'America/Sao_Paulo'
                });

                // Envia notificação
                const resultado = await this.notificacaoService.sendPush(
                    tokens,
                    "⏰ LEMBRETE DE VISITA!",
                    `Você tem visita agendada para ${horaFormatada} em ${imovel.titulo}`,
                    {
                        agendamentoId: agendamento._id.toString(),
                        type: 'lembrete_agendamento',
                        url: '/agendamentos'
                    }
                );

                if (resultado.success) {
                    // Marca como enviado
                    await this.agendamentoModel.updateOne(
                        { _id: agendamento._id },
                        {
                            $set: {
                                lembreteEnviado: true,
                                dataLembreteEnviado: new Date()
                            }
                        }
                    );

                    this.logger.log(`✅ Lembrete enviado para ${corretor.nome} - ${horaFormatada}`);
                } else {
                    this.logger.error(`❌ Falha ao enviar lembrete para ${corretor.nome}: ${resultado.message}`);
                }
            }
        } catch (error) {
            this.logger.error('❌ Erro ao enviar lembretes:', error);
        }
    }

}