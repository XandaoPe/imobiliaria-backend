import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Lead } from './schemas/lead.schema';
import { CreateLeadDto } from './dto/create-lead.dto';

@Injectable()
export class LeadsService {
    constructor(@InjectModel(Lead.name) private leadModel: Model<Lead>) { }

    // Criado pelo visitante na vitrine
    async create(createLeadDto: CreateLeadDto): Promise<Lead> {
        const novoLead = new this.leadModel(createLeadDto);
        return novoLead.save();
    }

    async findAllByEmpresa(empresaId: string): Promise<Lead[]> {
        return this.leadModel
            .find({
                $or: [
                    { empresa: empresaId },            // Caso seja string
                    { 'empresa._id': empresaId },     // Caso seja objeto (se gravou o objeto inteiro)
                    { 'empresa': new Types.ObjectId(empresaId) } // Caso seja ObjectId
                ]
            })
            .populate('imovel', 'titulo valor fotos')
            .populate('empresa', 'nome') // Garante que o front receba sempre o objeto agora
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
}