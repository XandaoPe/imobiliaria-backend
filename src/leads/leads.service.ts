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
        // 1. Busca usuários que têm pelo menos um token no array
        const destinatarios = await this.usuarioModel.find({
            empresa: lead.empresa,
            // Verifica se o array existe e não está vazio
            pushToken: { $exists: true, $not: { $size: 0 } },
            perfil: { $in: [PerfisEnum.CORRETOR, PerfisEnum.GERENTE] }
        });

        destinatarios.forEach(corretor => {
            // Se o seu NotificacaoService já aceita string[], o erro sumirá.
            // Se ele ainda espera string, você deve iterar sobre os tokens do corretor:
            corretor.pushToken.forEach(token => {
                this.notificacaoService.sendPush(
                    token,
                    "🎯 Novo Lead!",
                    `${lead.nome} tem interesse em um imóvel.`,
                    { leadId: lead['_id'].toString() }
                );
            });
        });
    }

    async findAllByEmpresa(empresaId: string, search?: string, status?: string): Promise<Lead[]> {
        // 1. Base da query com a empresa
        const query: any = this.getEmpresaQuery(empresaId);

        // 2. Lógica de Filtro Múltiplo de Status
        if (status && status !== 'TODOS') {
            // Se houver vírgula (ex: "NOVO,EM_ANDAMENTO"), vira array. 
            // Se for um status único (ex: "CONCLUIDO"), também funciona como array de um item.
            const statusArray = status.split(',');
            query.status = { $in: statusArray };
        }

        // 3. Lógica de Busca por Texto
        let searchFilter = {};
        if (search && search.trim() !== '') {
            searchFilter = {
                $or: [
                    { nome: { $regex: search, $options: 'i' } },
                    { contato: { $regex: search, $options: 'i' } }
                ]
            };
        }

        // 4. Execução da Query unificada
        return this.leadModel
            .find({ ...query, ...searchFilter }) // Combina os objetos de filtro
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