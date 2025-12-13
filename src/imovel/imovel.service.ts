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
        // ⭐️ LOG DE DEBUG: VERIFIQUE NO SEU TERMINAL SE TODOS OS CAMPOS ESTÃO AQUI
        console.log('Payload recebido pelo Service (CREATE):', createImovelDto);

        const createdImovel = new this.imovelModel({
            ...createImovelDto,
            empresa: new Types.ObjectId(empresaId),
        });

        return createdImovel.save();
    }

    async findAll(empresaId: string, search?: string): Promise<Imovel[]> {
        const filter: any = { empresa: new Types.ObjectId(empresaId) };

        if (search) {
            const regex = new RegExp(search, 'i');

            filter.$or = [
                { titulo: { $regex: regex } },
                { endereco: { $regex: regex } },
                { descricao: { $regex: regex } },
            ];
        }

        return this.imovelModel.find(filter).exec();
    }

    // 3. BUSCA ÚNICA: Filtra por ID do Imóvel E ID da Empresa
    async findOne(imovelId: string, empresaId: string): Promise<Imovel> {
        const imovel = await this.imovelModel
            .findOne({
                _id: imovelId,
                empresa: new Types.ObjectId(empresaId),
            })
            .exec();

        if (!imovel) {
            throw new NotFoundException(`Imóvel com ID "${imovelId}" não encontrado ou não pertence a esta empresa.`);
        }
        return imovel;
    }

    async update(imovelId: string, updateImovelDto: UpdateImovelDto, empresaId: string): Promise<Imovel> {
        // ⭐️ LOG DE DEBUG: VERIFIQUE NO SEU TERMINAL SE TODOS OS CAMPOS ESTÃO AQUI
        console.log('Payload recebido pelo Service (UPDATE):', updateImovelDto);

        const updatedImovel = await this.imovelModel
            .findOneAndUpdate(
                {
                    _id: imovelId,
                    empresa: new Types.ObjectId(empresaId)
                },
                updateImovelDto,
                { new: true },
            )
            .exec();

        if (!updatedImovel) {
            throw new NotFoundException(`Imóvel com ID "${imovelId}" não encontrado ou não pertence a esta empresa.`);
        }
        return updatedImovel;
    }

    async remove(imovelId: string, empresaId: string): Promise<{ message: string }> {
        const result = await this.imovelModel.deleteOne({
            _id: new Types.ObjectId(imovelId),
            empresa: new Types.ObjectId(empresaId)
        }).exec();

        if (result.deletedCount === 0) {
            throw new NotFoundException(`Imóvel com ID "${imovelId}" não encontrado ou não pertence a esta empresa.`);
        }

        return { message: `Imóvel com ID "${imovelId}" removido com sucesso.` };
    }

    // ====================================================================
    // Adicionar Foto
    // ====================================================================
    async addPhoto(imovelId: string, empresaId: string, filename: string): Promise<Imovel> {
        const imovel = await this.imovelModel.findOneAndUpdate(
            {
                _id: imovelId,
                empresa: new Types.ObjectId(empresaId)
            },
            { $push: { fotos: filename } },
            { new: true }
        ).exec();

        if (!imovel) {
            throw new NotFoundException(`Imóvel com ID "${imovelId}" não encontrado ou não pertence a esta empresa.`);
        }
        return imovel;
    }

    // ====================================================================
    // Remover Foto
    // ====================================================================
    async removePhoto(imovelId: string, empresaId: string, filename: string): Promise<Imovel> {
        const imovel = await this.imovelModel.findOneAndUpdate(
            {
                _id: imovelId,
                empresa: new Types.ObjectId(empresaId)
            },
            { $pull: { fotos: filename } },
            { new: true }
        ).exec();

        if (!imovel) {
            throw new NotFoundException(`Imóvel com ID "${imovelId}" não encontrado ou não pertence a esta empresa.`);
        }
        return imovel;
    }
}