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

        // 1. Bloqueio de data retroativa
        if (dataParaAgendar < new Date()) {
            throw new BadRequestException('Não é possível agendar visitas em datas passadas.');
        }

        // 2. Validação de existência
        await this.imovelService.findOne(createAgendamentoDto.imovelId, user.empresa);
        await this.clienteService.findOne(createAgendamentoDto.clienteId, user.empresa);

        // 3. Validação de Conflito (Ignora segundos para bater com o slot de 30min)
        dataParaAgendar.setSeconds(0, 0);
        const conflito = await this.findByDateAndImovel(dataParaAgendar.toISOString(), createAgendamentoDto.imovelId);

        if (conflito) {
            throw new BadRequestException('Já existe um agendamento para este imóvel neste horário.');
        }

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
    }

    async findAll(empresaId: string): Promise<Agendamento[]> {
        const agora = new Date();

        // Mantemos a auto-conclusão lógica
        await this.agendamentoModel.updateMany(
            {
                empresa: new Types.ObjectId(empresaId),
                status: 'PENDENTE',
                dataHora: { $lt: agora }
            },
            { $set: { status: 'CONCLUIDO' } }
        );

        // REMOVEMOS o filtro fixo de status para que o histórico fique disponível
        return this.agendamentoModel.find({
            empresa: new Types.ObjectId(empresaId)
            // status: { $in: ['PENDENTE', 'CONFIRMADO'] } <-- REMOVIDO
        })
            .populate('imovel cliente usuarioCorretor')
            .sort({ dataHora: 1 })
            .exec();
    }

    async findByDateAndImovel(dataHora: string, imovelId: string): Promise<Agendamento | null> {
        const dataBusca = new Date(dataHora);
        dataBusca.setSeconds(0, 0);
        dataBusca.setMilliseconds(0);

        return this.agendamentoModel.findOne({
            imovel: new Types.ObjectId(imovelId),
            dataHora: dataBusca,
            status: { $ne: 'CANCELADO' }
        }).exec();
    }

    async findHorariosOcupados(imovelId: string, data: string): Promise<string[]> {
        const inicioDia = new Date(data);
        inicioDia.setUTCHours(0, 0, 0, 0);

        const fimDia = new Date(data);
        fimDia.setUTCHours(23, 59, 59, 999);

        const agendamentos = await this.agendamentoModel.find({
            imovel: new Types.ObjectId(imovelId),
            dataHora: { $gte: inicioDia, $lte: fimDia },
            status: { $ne: 'CANCELADO' }
        }).select('dataHora').exec();

        // Retorna apenas as strings de hora (ex: ["10:00", "14:30"])
        return agendamentos.map(a => {
            const d = new Date(a.dataHora);
            return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        });
    }

    async updateStatus(id: string, status: string, motivo: string, empresaId: string): Promise<Agendamento> {
        const agendamento = await this.agendamentoModel.findOneAndUpdate(
            { _id: id, empresa: new Types.ObjectId(empresaId) },
            {
                $set: {
                    status: status,
                    observacoes: motivo // ⭐️ Gravando no campo correto do Schema
                }
            },
            { new: true }
        ).exec();

        if (!agendamento) throw new NotFoundException('Agendamento não encontrado.');
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

    async update(agendamentoId: string, updateAgendamentoDto: UpdateAgendamentoDto, empresaId: string): Promise<Agendamento> {
        const updated = await this.agendamentoModel
            .findOneAndUpdate(
                { _id: agendamentoId, empresa: new Types.ObjectId(empresaId) },
                updateAgendamentoDto,
                { new: true },
            ).populate('imovel cliente').exec();

        if (!updated) throw new NotFoundException('Agendamento não encontrado.');
        return updated;
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