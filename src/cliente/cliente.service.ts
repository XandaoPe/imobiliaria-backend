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

    // 1. CRIAÇÃO: Adiciona o empresaId do token
    async create(createClienteDto: CreateClienteDto, empresaId: string): Promise<Cliente> {
        const createdCliente = new this.clienteModel({
            ...createClienteDto,
            // ⭐️ Multitenancy: Associa o Cliente ao ID da empresa do usuário logado
            empresa: new Types.ObjectId(empresaId),
        });

        try {
            return createdCliente.save();
        } catch (error) {
            // Tratamento de erro de duplicação para CPF/Email dentro da empresa
            if (error.code === 11000) {
                const campo = error.keyPattern && error.keyPattern.cpf ? 'CPF' :
                    error.keyPattern && error.keyPattern.email ? 'Email' :
                        'campo único';
                throw new BadRequestException(`Erro de Duplicação: O ${campo} informado já está cadastrado nesta empresa.`);
            }
            throw error;
        }
    }

    async findAll(empresaId: string, search?: string): Promise<Cliente[]> {
        // Filtro base: SEMPRE buscar apenas os clientes da empresa logada
        const filter: FilterQuery<ClienteDocument> = {
            empresa: new Types.ObjectId(empresaId)
        };

        // Se houver termo de busca, adiciona a lógica de busca full-text nos campos relevantes
        if (search) {
            // Cria uma expressão regular que ignora maiúsculas/minúsculas
            const regex = new RegExp(search, 'i');

            // Usa $or para procurar o termo de busca em qualquer um dos campos
            filter.$or = [
                { nome: { $regex: regex } },
                { cpf: { $regex: regex } },
                { email: { $regex: regex } },
                { telefone: { $regex: regex } },
                { status: { $regex: regex } },
                { perfil: { $regex: regex } },
                { observacoes: { $regex: regex } },
            ];
        }

        // Executa a busca com o filtro combinado (empresaId E (campos com search))
        return this.clienteModel
            .find(filter)
            .exec();
    }

    // 3. BUSCA ÚNICA: Filtra por ID do Cliente E ID da Empresa
    async findOne(clienteId: string, empresaId: string): Promise<Cliente> {
        const cliente = await this.clienteModel
            .findOne({
                _id: clienteId,
                // ⭐️ CORREÇÃO: Converte para ObjectId
                empresa: new Types.ObjectId(empresaId),
            })
            .exec();

        if (!cliente) {
            throw new NotFoundException(`Cliente com ID "${clienteId}" não encontrado ou não pertence a esta empresa.`);
        }
        return cliente;
    }

    // 4. ATUALIZAÇÃO: Filtra por ID do Cliente E ID da Empresa
    async update(clienteId: string, updateClienteDto: UpdateClienteDto, empresaId: string): Promise<Cliente> {

        const updatedCliente = await this.clienteModel
            .findOneAndUpdate(
                {
                    _id: clienteId,
                    empresa: new Types.ObjectId(empresaId)
                },
                updateClienteDto,
                { new: true },
            )
            .exec();

        if (!updatedCliente) {
            throw new NotFoundException(`Cliente com ID "${clienteId}" não encontrado ou não pertence a esta empresa.`);
        }
        return updatedCliente;
    }

    // 5. REMOÇÃO: Filtra por ID do Cliente E ID da Empresa
    async remove(clienteId: string, empresaId: string): Promise<void> {
        const result = await this.clienteModel.deleteOne({
            _id: clienteId,
            empresa: new Types.ObjectId(empresaId)
        }).exec();

        if (result.deletedCount === 0) {
            throw new NotFoundException(`Cliente com ID "${clienteId}" não encontrado ou não pertence a esta empresa.`);
        }
    }
}