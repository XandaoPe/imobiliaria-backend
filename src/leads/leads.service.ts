import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Lead } from './schemas/lead.schema';
import { CreateLeadDto } from './dto/create-lead.dto';

@Injectable()
export class LeadsService {
    constructor(@InjectModel(Lead.name) private leadModel: Model<Lead>) { }
    
    async countNovos(empresaId: string): Promise<{ count: number }> {
        // Aplicamos a mesma lógica de flexibilidade de ID/Objeto do findAllByEmpresa
        const query = {
            status: 'NOVO',
            $or: [
                { empresa: new Types.ObjectId(empresaId) },
                { 'empresa._id': empresaId },
                { 'empresa._id': new Types.ObjectId(empresaId) }
            ]
        };

        const total = await this.leadModel.countDocuments(query);

        return { count: total };
    }

    async create(createLeadDto: CreateLeadDto): Promise<Lead> {
        const novoLead = new this.leadModel(createLeadDto);
        return novoLead.save();
    }

    async findAllByEmpresa(empresaId: string, search?: string, status?: string): Promise<Lead[]> {
        const query: any = {
            // Esta condição aceita se "empresa" for o ID direto OU se for o objeto contendo o ID
            $or: [
                { empresa: new Types.ObjectId(empresaId) },
                { 'empresa._id': empresaId },
                { 'empresa._id': new Types.ObjectId(empresaId) }
            ]
        };

        // Filtro de Status
        if (status && status !== 'TODOS') {
            query.status = status;
        }

        // Filtro de Busca por Nome ou Contato
        if (search && search.trim() !== '') {
            // Como já usamos um $or para a empresa, precisamos usar $and para combinar com a busca
            const searchFilter = {
                $or: [
                    { nome: { $regex: search, $options: 'i' } },
                    { contato: { $regex: search, $options: 'i' } }
                ]
            };

            // Mesclamos a busca na query principal
            return this.leadModel
                .find({ ...query, ...searchFilter })
                .populate('imovel', 'titulo valor fotos')
                .sort({ createdAt: -1 })
                .exec();
        }

        return this.leadModel
            .find(query)
            .populate('imovel', 'titulo valor fotos')
            .sort({ createdAt: -1 })
            .exec();
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

    // leads.service.ts

    async getDashboardStats(empresaId: string) {
        const queryEmpresa = {
            $or: [
                { empresa: new Types.ObjectId(empresaId) },
                { 'empresa._id': empresaId },
                { 'empresa._id': new Types.ObjectId(empresaId) }
            ]
        };

        // Executa as contagens em paralelo para ser ultra rápido
        const [total, novos, emAtendimento, encerrados] = await Promise.all([
            this.leadModel.countDocuments(queryEmpresa),
            this.leadModel.countDocuments({ ...queryEmpresa, status: 'NOVO' }),
            this.leadModel.countDocuments({ ...queryEmpresa, status: 'EM_ANDAMENTO' }),
            this.leadModel.countDocuments({ ...queryEmpresa, status: 'CONCLUIDO' }), // Ajuste conforme seus nomes de status
        ]);

        return { total, novos, emAtendimento, encerrados };
    }

}