import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Lead } from './schemas/lead.schema';
import { CreateLeadDto } from './dto/create-lead.dto';
import { Usuario, UsuarioDocument, PerfisEnum } from 'src/usuario/schemas/usuario.schema';
import { NotificacaoService } from 'src/notificacao/notificacao.service';

@Injectable()
export class LeadsService {
    constructor(
        @InjectModel(Lead.name) private leadModel: Model<Lead>,
        @InjectModel(Usuario.name) private usuarioModel: Model<UsuarioDocument>,
        private readonly notificacaoService: NotificacaoService,
    ) { }

    /**
     * Auxiliar para criar a query de empresa padronizada
     */
    private getEmpresaQuery(empresaId: string) {
        return {
            $or: [
                { empresa: new Types.ObjectId(empresaId) },
                { 'empresa._id': empresaId },
                { 'empresa._id': new Types.ObjectId(empresaId) }
            ]
        };
    }

    async create(createLeadDto: CreateLeadDto): Promise<Lead> {
        // 1. Preparação dos dados com conversão de IDs
        const leadData = {
            ...createLeadDto,
            imovel: createLeadDto.imovel ? new Types.ObjectId(createLeadDto.imovel) : null,
            empresa: new Types.ObjectId(createLeadDto.empresa),
        };

        const novoLead = new this.leadModel(leadData);
        const leadSalvo = await novoLead.save();

        // 2. DISPARO DE NOTIFICAÇÃO (Async mas não bloqueante)
        this.notificarCorretores(leadSalvo).catch(err =>
            console.error('Erro ao processar notificações de push:', err)
        );

        return leadSalvo;
    }

    /**
     * Lógica isolada para buscar corretores e enviar push
     */
    private async notificarCorretores(lead: Lead): Promise<void> {
        // Busca usuários da empresa que são CORRETORES ou GERENTES e que têm pushToken
        const destinatarios = await this.usuarioModel.find({
            empresa: lead.empresa,
            pushToken: { $exists: true, $ne: "" },
            perfil: { $in: [PerfisEnum.CORRETOR, PerfisEnum.GERENTE] }
        });

        destinatarios.forEach(corretor => {
            this.notificacaoService.sendPush(
                corretor.pushToken,
                "🎯 Novo Lead!",
                `${lead.nome} tem interesse em um imóvel.`,
                { leadId: lead['_id'].toString() }
            );
        });
    }

    async findAllByEmpresa(empresaId: string, search?: string, status?: string): Promise<Lead[]> {
        const query: any = this.getEmpresaQuery(empresaId);

        if (status && status !== 'TODOS') {
            query.status = status;
        }

        if (search && search.trim() !== '') {
            const searchFilter = {
                $or: [
                    { nome: { $regex: search, $options: 'i' } },
                    { contato: { $regex: search, $options: 'i' } }
                ]
            };
            // Combina a query da empresa com o filtro de busca
            return this.leadModel
                .find({ $and: [query, searchFilter] })
                .populate('imovel', 'titulo aluguel valor fotos')
                .sort({ createdAt: -1 })
                .exec();
        }

        return this.leadModel
            .find(query)
            .populate('imovel', 'titulo aluguel valor fotos')
            .sort({ createdAt: -1 })
            .exec();
    }

    async countNovos(empresaId: string): Promise<{ count: number }> {
        const query = {
            status: 'NOVO',
            ...this.getEmpresaQuery(empresaId)
        };
        const total = await this.leadModel.countDocuments(query);
        return { count: total };
    }

    async updateStatus(id: string, status: string): Promise<Lead> {
        const leadAtualizado = await this.leadModel
            .findByIdAndUpdate(id, { status }, { new: true })
            .exec();

        if (!leadAtualizado) {
            throw new NotFoundException(`Lead com ID ${id} não encontrado`);
        }
        return leadAtualizado;
    }

    async getDashboardStats(empresaId: string) {
        const queryEmpresa = this.getEmpresaQuery(empresaId);

        const [total, novos, emAtendimento, encerrados] = await Promise.all([
            this.leadModel.countDocuments(queryEmpresa),
            this.leadModel.countDocuments({ ...queryEmpresa, status: 'NOVO' }),
            this.leadModel.countDocuments({ ...queryEmpresa, status: 'EM_ANDAMENTO' }),
            this.leadModel.countDocuments({ ...queryEmpresa, status: 'CONCLUIDO' }),
        ]);

        return { total, novos, emAtendimento, encerrados };
    }
}