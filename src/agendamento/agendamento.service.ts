// src/agendamento/agendamento.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Agendamento, AgendamentoDocument } from './schemas/agendamento.schema';
import { CreateAgendamentoDto } from './dto/create-agendamento.dto';
import { UpdateAgendamentoDto } from './dto/update-agendamento.dto'; // ⭐️ DTO de Update (Criaremos depois)
import { ImovelService } from 'src/imovel/imovel.service';
import { ClienteService } from 'src/cliente/cliente.service';
import { UsuarioPayload } from 'src/auth/interfaces/usuario-payload.interface';
import { NotificacaoService } from 'src/notificacao/notificacao.service';

@Injectable()
export class AgendamentoService {
    constructor(
        @InjectModel(Agendamento.name) private readonly agendamentoModel: Model<AgendamentoDocument>,
        private readonly clienteService: ClienteService,
        private readonly imovelService: ImovelService,
        private readonly notificacaoService: NotificacaoService, // ⭐️ INJETAR
    ) { }

    // ====================================================================
    // ⭐️ CREATE
    // ====================================================================
    async create(createAgendamentoDto: CreateAgendamentoDto, user: UsuarioPayload): Promise<Agendamento> {
        const empresaId = new Types.ObjectId(user.empresa);
        const usuarioCorretorId = new Types.ObjectId(user.userId);
        const imovelId = createAgendamentoDto.imovelId;
        const clienteId = createAgendamentoDto.clienteId;

        // 1. Validação de existência e pertencimento (Multitenancy)
        await this.imovelService.findOne(imovelId, empresaId.toHexString()).catch(() => {
            throw new NotFoundException(`Imóvel com ID ${imovelId} não encontrado nesta empresa.`);
        });
        await this.clienteService.findOne(clienteId, empresaId.toHexString()).catch(() => {
            throw new NotFoundException(`Cliente com ID ${clienteId} não encontrado nesta empresa.`);
        });

        // 2. Validação de Conflito de Horário
        const conflito = await this.agendamentoModel.findOne({
            empresa: empresaId,
            imovel: new Types.ObjectId(imovelId),
            dataHora: new Date(createAgendamentoDto.dataHora),
            status: { $ne: 'CANCELADO' },
        }).exec();

        if (conflito) {
            throw new BadRequestException('Já existe um agendamento confirmado ou pendente para este imóvel neste horário.');
        }

        // 3. Criação
        const createdAgendamento = new this.agendamentoModel({
            ...createAgendamentoDto,
            empresa: empresaId,
            usuarioCorretor: usuarioCorretorId,
            imovel: imovelId,
            cliente: clienteId,
            dataHora: new Date(createAgendamentoDto.dataHora),
        });

        try {
            return createdAgendamento.save();
        } catch (error) {
            if (error.code === 11000) {
                throw new BadRequestException('Conflito: Já existe um agendamento idêntico (Imóvel/DataHora) no banco de dados.');
            }
            throw error;
        }
    }

    // ====================================================================
    // ⭐️ FIND ALL (Multitenancy)
    // ====================================================================
    async findAll(empresaId: string): Promise<Agendamento[]> {
        return this.agendamentoModel.find({ empresa: new Types.ObjectId(empresaId) })
            .populate('imovel')
            .populate('cliente')
            .populate('usuarioCorretor')
            .exec();
    }

    // ====================================================================
    // ⭐️ FIND ONE (Multitenancy)
    // ====================================================================
    async findOne(agendamentoId: string, empresaId: string): Promise<Agendamento> {
        const agendamento = await this.agendamentoModel
            .findOne({
                _id: agendamentoId,
                // 🔑 Filtro de Multitenancy
                empresa: new Types.ObjectId(empresaId),
            })
            .populate('imovel')
            .populate('cliente')
            .populate('usuarioCorretor')
            .exec();

        if (!agendamento) {
            throw new NotFoundException(`Agendamento com ID "${agendamentoId}" não encontrado ou não pertence a esta empresa.`);
        }
        return agendamento;
    }

    // ====================================================================
    // ⭐️ UPDATE (Multitenancy)
    // ====================================================================
    async update(agendamentoId: string, updateAgendamentoDto: UpdateAgendamentoDto, empresaId: string): Promise<Agendamento> {
        // 1. Atualizar o agendamento no DB
        const updatedAgendamento = await this.agendamentoModel
            .findOneAndUpdate(
                {
                    _id: agendamentoId,
                    empresa: new Types.ObjectId(empresaId)
                },
                updateAgendamentoDto,
                { new: true },
            )
            // ⭐️ Popula os dados necessários para o e-mail
            .populate('imovel')
            .populate('cliente')
            .exec();

        if (!updatedAgendamento) {
            throw new NotFoundException(`Agendamento com ID "${agendamentoId}" não encontrado.`);
        }

        // 2. ⭐️ Lógica de Notificação: Se o status for CONFIRMADO, envie o e-mail.
        if (updateAgendamentoDto.status === 'CONFIRMADO') {
            const cliente: any = updatedAgendamento.cliente; // Assume que cliente está populado
            const imovel: any = updatedAgendamento.imovel; // Assume que imovel está populado

            // Dados do Corretor (aqui você precisaria buscar o usuário logado ou o usuário do agendamento)
            // Simplificando, usaremos dados estáticos ou do token se for o caso.
            // Se precisar dos dados do corretor, você teria que injetar o UsuarioService.

            await this.notificacaoService.sendEmail(
                cliente.email, // Email do cliente
                'Seu Agendamento de Visita foi Confirmado!',
                'confirmacao',
                {
                    clienteNome: cliente.nome,
                    imovelTitulo: imovel.titulo,
                    imovelEndereco: imovel.endereco,
                    dataHora: updatedAgendamento.dataHora.toLocaleString('pt-BR'),
                    corretorNome: 'Corretor (Necessita do Service de Usuário)',
                    corretorEmail: 'contato@imobiliaria.com',
                    nomeEmpresa: 'Sua Imobiliária'
                }
            );
        }

        return updatedAgendamento;
    }

    // ====================================================================
    // ⭐️ DELETE (Multitenancy)
    // ====================================================================
    async remove(agendamentoId: string, empresaId: string): Promise<{ message: string }> {
        const result = await this.agendamentoModel.deleteOne({
            _id: agendamentoId,
            // 🔑 Filtro de Multitenancy
            empresa: new Types.ObjectId(empresaId)
        }).exec();

        if (result.deletedCount === 0) {
            throw new NotFoundException(`Agendamento com ID "${agendamentoId}" não encontrado ou não pertence a esta empresa.`);
        }
        return { message: `Agendamento com ID "${agendamentoId}" removido com sucesso.` };
    }
}