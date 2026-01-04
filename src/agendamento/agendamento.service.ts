// src/agendamento/agendamento.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Agendamento, AgendamentoDocument } from './schemas/agendamento.schema';
import { CreateAgendamentoDto } from './dto/create-agendamento.dto';
import { UpdateAgendamentoDto } from './dto/update-agendamento.dto';
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
        private readonly notificacaoService: NotificacaoService,
    ) { }

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
        const conflitoCorretor = await this.findByDateAndUser(dataParaAgendar.toISOString(), user.userId);
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
                status: 'PENDENTE'
            });

            return await createdAgendamento.save();
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

        // Define o filtro base por empresa
        const query: any = { empresa: empresaId };

        // Se for CORRETOR, filtra para ver apenas os dele. 
        // Se for ADM ou GERENTE, a query permanece apenas com empresaId (vê tudo).
        if (user.perfil === 'CORRETOR') {
            query.usuarioCorretor = new Types.ObjectId(user.userId);
        }

        // Auto-conclusão lógica (agora respeitando o filtro de visibilidade)
        await this.agendamentoModel.updateMany(
            {
                ...query,
                status: 'PENDENTE',
                dataHora: { $lt: agora }
            },
            { $set: { status: 'CONCLUIDO' } }
        );

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

    async findHorariosOcupadosDoUsuario(usuarioId: string, data: string): Promise<string[]> {
        const inicioDia = new Date(data);
        inicioDia.setUTCHours(0, 0, 0, 0);

        const fimDia = new Date(data);
        fimDia.setUTCHours(23, 59, 59, 999);

        const agendamentos = await this.agendamentoModel.find({
            usuarioCorretor: new Types.ObjectId(usuarioId),
            dataHora: { $gte: inicioDia, $lte: fimDia },
            status: 'PENDENTE' // ⭐️ LIBERA O HORÁRIO NO SELECT SE FOR CANCELADO/CONCLUÍDO
        }).select('dataHora').exec();

        return agendamentos.map(a => {
            const d = new Date(a.dataHora);
            return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
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
        ).exec();

        if (!agendamento) throw new NotFoundException('Agendamento não encontrado ou sem permissão.');
        return agendamento;
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
}