// src/imovel/imovel.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Imovel, ImovelDocument } from './schemas/imovel.schema';
import { CreateImovelDto } from './dto/create-imovel.dto';
import { UpdateImovelDto } from './dto/update-imovel.dto';

@Injectable()
export class ImovelService {
    constructor(
        @InjectModel(Imovel.name) private imovelModel: Model<ImovelDocument>,
    ) { }

    // 1. CRIAÇÃO: Adiciona o empresaId do token
    async create(createImovelDto: CreateImovelDto, empresaId: string): Promise<Imovel> {
        const createdImovel = new this.imovelModel({
            ...createImovelDto,
            //
            empresa: new Types.ObjectId(empresaId),
        });
        console.log('IMOVEL SERVICE CREATE...', createImovelDto, empresaId); 
        return createdImovel.save();
    }

    async findAll(empresaId: string): Promise<Imovel[]> {
        return this.imovelModel.find({
            // ⭐️ CORREÇÃO: Converte a string do token para ObjectId
            empresa: new Types.ObjectId(empresaId)
        }).exec();
    }

    // 3. BUSCA ÚNICA: Filtra por ID do Imóvel E ID da Empresa
    async findOne(imovelId: string, empresaId: string): Promise<Imovel> {
        const imovel = await this.imovelModel
            .findOne({
                _id: imovelId,
                // ⭐️ CORREÇÃO: Converte para ObjectId
                empresa: new Types.ObjectId(empresaId),
            })
            .exec();

        if (!imovel) {
            // Retorna 404 se não for encontrado OU se o ID pertencer a OUTRA empresa.
            throw new NotFoundException(`Imóvel com ID "${imovelId}" não encontrado ou não pertence a esta empresa.`);
        }
        return imovel;
    }

    // 4. ATUALIZAÇÃO: Filtra por ID do Imóvel E ID da Empresa
    async update(imovelId: string, updateImovelDto: UpdateImovelDto, empresaId: string): Promise<Imovel> {
        const updatedImovel = await this.imovelModel
            .findOneAndUpdate(
                { _id: imovelId, empresa: empresaId }, // ⭐️ Filtro de busca + Multitenancy
                updateImovelDto,
                { new: true },
            )
            .exec();

        if (!updatedImovel) {
            throw new NotFoundException(`Imóvel com ID "${imovelId}" não encontrado ou não pertence a esta empresa.`);
        }
        return updatedImovel;
    }

    // 5. REMOÇÃO: Filtra por ID do Imóvel E ID da Empresa
    async remove(imovelId: string, empresaId: string): Promise<void> {
        const result = await this.imovelModel.deleteOne({
            _id: imovelId,
            empresa: empresaId // ⭐️ Filtro de remoção + Multitenancy
        }).exec();

        if (result.deletedCount === 0) {
            throw new NotFoundException(`Imóvel com ID "${imovelId}" não encontrado ou não pertence a esta empresa.`);
        }
    }
}