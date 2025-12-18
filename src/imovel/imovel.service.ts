import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, FilterQuery } from 'mongoose';
import { Imovel, ImovelDocument } from './schemas/imovel.schema';
import { CreateImovelDto } from './dto/create-imovel.dto';
import { UpdateImovelDto } from './dto/update-imovel.dto';

@Injectable()
export class ImovelService {
    constructor(
        @InjectModel(Imovel.name) private imovelModel: Model<ImovelDocument>,
    ) { }

    // ⭐️ MÉTODO DE VALIDAÇÃO: Centraliza a verificação do ID BSON
    private validateAndConvertId(id: string, name: string = 'ID'): Types.ObjectId {
        // Verifica se o ID é uma string de 24 caracteres hexadecimais (padrão MongoDB)
        if (!id || typeof id !== 'string' || id.length !== 24) {
            throw new BadRequestException(`${name} fornecido é inválido.`);
        }

        try {
            return new Types.ObjectId(id);
        } catch (error) {
            // Captura erros de formato que não são detectados pelo length (embora raro)
            throw new BadRequestException(`${name} fornecido está em um formato inválido.`);
        }
    }


    // 1. CRIAÇÃO: Adiciona o empresaId do token
    async create(createImovelDto: CreateImovelDto, empresaId: string): Promise<Imovel> {

        // ⭐️ Aplica a validação
        const empresaObjectId = this.validateAndConvertId(empresaId, 'ID da Empresa');

        const createdImovel = new this.imovelModel({
            ...createImovelDto,
            empresa: empresaObjectId,
        });

        return createdImovel.save();
    }

    // 2. BUSCA GERAL: Adiciona filtro de status (disponível/indisponível)
    async findAll(empresaId: string, search?: string, status?: string): Promise<Imovel[]> {

        // ⭐️ Aplica a validação
        const empresaObjectId = this.validateAndConvertId(empresaId, 'ID da Empresa');

        // Agora o 'empresaId' está seguro para ser usado no BSON
        const filter: FilterQuery<ImovelDocument> = { empresa: empresaObjectId };

        // ⭐️ NOVO: Lógica para filtrar por Status
        if (status) {
            if (status.toUpperCase() === 'DISPONIVEL') {
                filter.disponivel = true;
            } else if (status.toUpperCase() === 'INDISPONIVEL') {
                filter.disponivel = false;
            }
        }

        if (search) {
            const regex = new RegExp(search, 'i');

            // Os campos do $or combinam com os campos buscáveis do frontend
            filter.$or = [
                { titulo: { $regex: regex } },
                { endereco: { $regex: regex } },
                { descricao: { $regex: regex } },
                // Adicione outros campos, se necessário
            ];
        }

        // Executa a busca com o filtro combinado
        return this.imovelModel.find(filter).exec();
    }

    async findAllPublico() {
        return this.imovelModel
            .find({ disponivel: true }) // Apenas os disponíveis na vitrine
            .populate('empresa', 'nome') // ⭐️ BUSCA APENAS O NOME E LOGO DA EMPRESA
            .exec();
    }

    // 3. BUSCA ÚNICA: Filtra por ID do Imóvel E ID da Empresa
    async findOne(imovelId: string, empresaId: string): Promise<Imovel> {

        // ⭐️ Aplica a validação
        const empresaObjectId = this.validateAndConvertId(empresaId, 'ID da Empresa');
        const imovelObjectId = this.validateAndConvertId(imovelId, 'ID do Imóvel');

        const imovel = await this.imovelModel
            .findOne({
                _id: imovelObjectId,
                empresa: empresaObjectId,
            })
            .exec();

        if (!imovel) {
            throw new NotFoundException(`Imóvel com ID "${imovelId}" não encontrado ou não pertence a esta empresa.`);
        }
        return imovel;
    }

    async update(imovelId: string, updateImovelDto: UpdateImovelDto, empresaId: string): Promise<Imovel> {

        // ⭐️ Aplica a validação
        const empresaObjectId = this.validateAndConvertId(empresaId, 'ID da Empresa');
        const imovelObjectId = this.validateAndConvertId(imovelId, 'ID do Imóvel');

        const updatedImovel = await this.imovelModel
            .findOneAndUpdate(
                {
                    _id: imovelObjectId,
                    empresa: empresaObjectId
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

        // ⭐️ Aplica a validação
        const empresaObjectId = this.validateAndConvertId(empresaId, 'ID da Empresa');
        const imovelObjectId = this.validateAndConvertId(imovelId, 'ID do Imóvel');

        const result = await this.imovelModel.deleteOne({
            _id: imovelObjectId,
            empresa: empresaObjectId
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

        // ⭐️ Aplica a validação
        const empresaObjectId = this.validateAndConvertId(empresaId, 'ID da Empresa');
        const imovelObjectId = this.validateAndConvertId(imovelId, 'ID do Imóvel');

        const imovel = await this.imovelModel.findOneAndUpdate(
            {
                _id: imovelObjectId,
                empresa: empresaObjectId
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

        // ⭐️ Aplica a validação
        const empresaObjectId = this.validateAndConvertId(empresaId, 'ID da Empresa');
        const imovelObjectId = this.validateAndConvertId(imovelId, 'ID do Imóvel');

        const imovel = await this.imovelModel.findOneAndUpdate(
            {
                _id: imovelObjectId,
                empresa: empresaObjectId
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