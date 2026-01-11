// src/cliente/cliente.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { Cliente, ClienteDocument } from './schemas/cliente.schema';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';

@Injectable()
export class ClienteService {
    constructor(
        @InjectModel(Cliente.name) private clienteModel: Model<ClienteDocument>,
    ) { }

    async create(createClienteDto: CreateClienteDto, empresaId: string): Promise<Cliente> {
        const createdCliente = new this.clienteModel({
            ...createClienteDto,
            empresa: new Types.ObjectId(empresaId),
        });

        try {
            return await createdCliente.save();
        } catch (error) {
            if (error.code === 11000) {
                const campo = error.keyPattern?.cpf ? 'CPF' : error.keyPattern?.email ? 'Email' : 'campo único';
                throw new BadRequestException(`Erro de Duplicação: O ${campo} informado já está cadastrado nesta empresa.`);
            }
            throw error;
        }
    }

    async findAll(empresaId: string, search?: string, status?: string): Promise<Cliente[]> {
        const filter: FilterQuery<ClienteDocument> = {
            empresa: new Types.ObjectId(empresaId)
        };

        if (status && (status === 'ATIVO' || status === 'INATIVO')) {
            filter.status = status;
        }

        if (search) {
            const regex = new RegExp(search, 'i');
            filter.$or = [
                { nome: { $regex: regex } },
                { cpf: { $regex: regex } },
                { email: { $regex: regex } },
                { telefone: { $regex: regex } },
                { status: { $regex: regex } },
                { perfil: { $regex: regex } },
                { observacoes: { $regex: regex } },
                // ⭐️ ADICIONADO: Permitir busca por endereço e cidade
                { endereco: { $regex: regex } },
                { cidade: { $regex: regex } },
            ];
        }

        return this.clienteModel.find(filter).sort({ nome: 1 }).exec();
    }

    async findOne(clienteId: string, empresaId: string): Promise<Cliente> {
        const cliente = await this.clienteModel.findOne({
            _id: clienteId,
            empresa: new Types.ObjectId(empresaId),
        }).exec();

        if (!cliente) {
            throw new NotFoundException(`Cliente não encontrado ou não pertence a esta empresa.`);
        }
        return cliente;
    }

    async update(clienteId: string, updateClienteDto: UpdateClienteDto, empresaId: string): Promise<Cliente> {
        const updatedCliente = await this.clienteModel.findOneAndUpdate(
            { _id: clienteId, empresa: new Types.ObjectId(empresaId) },
            updateClienteDto,
            { new: true },
        ).exec();

        if (!updatedCliente) {
            throw new NotFoundException(`Cliente não encontrado ou não pertence a esta empresa.`);
        }
        return updatedCliente;
    }

    async remove(clienteId: string, empresaId: string): Promise<any> {
        const result = await this.clienteModel.deleteOne({
            _id: clienteId,
            empresa: new Types.ObjectId(empresaId)
        }).exec();

        if (result.deletedCount === 0) {
            throw new NotFoundException(`Cliente não encontrado.`);
        }
        return { message: 'Cliente removido com sucesso' };
    }
}