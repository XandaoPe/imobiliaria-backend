// src/contrato/contrato.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Contrato, ContratoDocument } from './schemas/contrato.schema';
import { CreateContratoDto } from './dto/create-contrato.dto';
import { UpdateContratoDto } from './dto/update-contrato.dto';

import { ImovelService } from 'src/imovel/imovel.service';
import { ClienteService } from 'src/cliente/cliente.service';
import { UsuarioPayload } from 'src/auth/jwt.strategy';

@Injectable()
export class ContratoService {
    constructor(
        @InjectModel(Contrato.name) private readonly contratoModel: Model<ContratoDocument>,
        private readonly imovelService: ImovelService,
        private readonly clienteService: ClienteService,
    ) { }

    // ====================================================================
    // ⭐️ CREATE
    // ====================================================================
    async create(createContratoDto: CreateContratoDto, user: UsuarioPayload): Promise<Contrato> {
        const empresaId = new Types.ObjectId(user.empresa);
        const usuarioCorretorId = new Types.ObjectId(user.userId);
        const imovelId = createContratoDto.imovelId;
        const clienteId = createContratoDto.clienteId;

        // 1. Validação de existência e pertencimento (Multitenancy)
        await this.imovelService.findOne(imovelId, empresaId.toHexString()).catch(() => {
            throw new NotFoundException(`Imóvel com ID ${imovelId} não encontrado nesta empresa.`);
        });
        await this.clienteService.findOne(clienteId, empresaId.toHexString()).catch(() => {
            throw new NotFoundException(`Cliente com ID ${clienteId} não encontrado nesta empresa.`);
        });

        // 2. Criação
        const createdContrato = new this.contratoModel({
            ...createContratoDto,
            empresa: empresaId,
            usuarioCorretor: usuarioCorretorId,
            imovel: imovelId,
            cliente: clienteId,
        });

        return createdContrato.save();
    }

    // ====================================================================
    // ⭐️ FIND ALL (Multitenancy)
    // ====================================================================
    async findAll(empresaId: string): Promise<Contrato[]> {
        return this.contratoModel.find({ empresa: new Types.ObjectId(empresaId) })
            .populate('imovel')
            .populate('cliente')
            .populate('usuarioCorretor')
            .exec();
    }

    // ====================================================================
    // ⭐️ FIND ONE (Multitenancy)
    // ====================================================================
    async findOne(contratoId: string, empresaId: string): Promise<Contrato> {
        const contrato = await this.contratoModel
            .findOne({
                _id: contratoId,
                // 🔑 Filtro de Multitenancy
                empresa: new Types.ObjectId(empresaId),
            })
            .populate('imovel')
            .populate('cliente')
            .populate('usuarioCorretor')
            .exec();

        if (!contrato) {
            throw new NotFoundException(`Contrato com ID "${contratoId}" não encontrado ou não pertence a esta empresa.`);
        }
        return contrato;
    }

    // ====================================================================
    // ⭐️ UPDATE (Multitenancy)
    // ====================================================================
    async update(contratoId: string, updateContratoDto: UpdateContratoDto, empresaId: string): Promise<Contrato> {
        const updatedContrato = await this.contratoModel
            .findOneAndUpdate(
                {
                    _id: contratoId,
                    empresa: new Types.ObjectId(empresaId)
                },
                updateContratoDto,
                { new: true },
            )
            .exec();

        if (!updatedContrato) {
            throw new NotFoundException(`Contrato com ID "${contratoId}" não encontrado ou não pertence a esta empresa.`);
        }
        return updatedContrato;
    }

    // ====================================================================
    // ⭐️ DELETE (Multitenancy)
    // ====================================================================
    async remove(contratoId: string, empresaId: string): Promise<{ message: string }> {
        const result = await this.contratoModel.deleteOne({
            _id: contratoId,
            empresa: new Types.ObjectId(empresaId)
        }).exec();

        if (result.deletedCount === 0) {
            throw new NotFoundException(`Contrato com ID "${contratoId}" não encontrado ou não pertence a esta empresa.`);
        }
        return { message: `Contrato com ID "${contratoId}" removido com sucesso.` };
    }
}