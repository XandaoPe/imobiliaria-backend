import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, FilterQuery } from 'mongoose';
import { Imovel, ImovelDocument } from './schemas/imovel.schema';
import { CreateImovelDto } from './dto/create-imovel.dto';
import { UpdateImovelDto } from './dto/update-imovel.dto';
import { UploadService } from 'src/upload/upload.service';

@Injectable()
export class ImovelService {
    constructor(
        @InjectModel(Imovel.name) private imovelModel: Model<ImovelDocument>,
        private readonly uploadService: UploadService,
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

    async findAll(empresaId: string, search?: string, status?: string): Promise<Imovel[]> {
        const empresaObjectId = this.validateAndConvertId(empresaId, 'ID da Empresa');

        const pipeline: any[] = [
            {
                // Filtra primeiro pela empresa do usuário logado (Multitenancy)
                $match: { empresa: empresaObjectId }
            },
            {
                $lookup: {
                    from: 'empresas', // Nome da sua coleção de empresas
                    localField: 'empresa',
                    foreignField: '_id',
                    as: 'empresa_info',
                },
            },
            { $unwind: '$empresa_info' },
        ];

        // Filtro de Status (Disponível/Indisponível)
        if (status) {
            const isDisponivel = status.toUpperCase() === 'DISPONIVEL';
            pipeline.push({ $match: { disponivel: isDisponivel } });
        }

        // Busca Textual (Título, Endereço, Cidade e NOME DA EMPRESA)
        if (search) {
            const regex = new RegExp(search, 'i');
            pipeline.push({
                $match: {
                    $or: [
                        { titulo: { $regex: regex } },
                        { endereco: { $regex: regex } },
                        { cidade: { $regex: regex } },
                        { descricao: { $regex: regex } },
                        { 'empresa_info.nome': { $regex: regex } }, // Agora a busca por nome funciona logado!
                    ],
                },
            });
        }

        // Projeta os dados para o formato que o Frontend espera
        pipeline.push({
            $project: {
                titulo: 1,
                tipo: 1,
                endereco: 1,
                valor: 1,
                disponivel: 1,
                cidade: 1,
                descricao: 1,
                fotos: 1,
                detalhes: 1,
                quartos: 1,
                banheiros: 1,
                area_terreno: 1,
                area_construida: 1,
                garagem: 1,
                empresa: '$empresa_info', 
            }
        });

        return this.imovelModel.aggregate(pipeline).exec();
    }

    async findAllPublico(search?: string) {
        // 1. Criamos o estágio de Lookup para trazer os dados da empresa ANTES do filtro
        const pipeline: any[] = [
            {
                $lookup: {
                    from: 'empresas', // Nome da coleção de empresas no MongoDB (geralmente plural)
                    localField: 'empresa',
                    foreignField: '_id',
                    as: 'empresa_info',
                },
            },
            { $unwind: '$empresa_info' }, // Transforma o array em objeto
            {
                $match: {
                    disponivel: true, // Apenas imóveis disponíveis
                },
            },
        ];

        // 2. Se houver busca, adicionamos o estágio de Match com o OR
        if (search) {
            const regex = new RegExp(search, 'i');
            pipeline.push({
                $match: {
                    $or: [
                        { titulo: { $regex: regex } },
                        { cidade: { $regex: regex } },
                        { endereco: { $regex: regex } },
                        { descricao: { $regex: regex } },
                        { 'empresa_info.nome': { $regex: regex } }, // Agora a busca no nome da empresa funciona!
                    ],
                },
            });
        }

        // 3. Projetamos o resultado para manter a estrutura original do seu Objeto (opcional mas recomendado)
        pipeline.push({
            $project: {
                titulo: 1,
                tipo: 1,
                endereco: 1,
                valor: 1,
                disponivel: 1,
                cidade: 1,
                descricao: 1,
                fotos: 1,
                area_construida: 1,
                area_terreno: 1,
                quartos: 1,
                banheiros: 1,
                garagem: 1,
                empresa: '$empresa_info', // Mapeia de volta para o campo 'empresa'
            }
        });

        return this.imovelModel.aggregate(pipeline).exec();
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
    async removePhoto(imovelId: string, empresaId: string, photoUrl: string): Promise<Imovel> {
        // 1. Remove do Cloudinary
        await this.uploadService.deleteImage(photoUrl);

        // 2. Tenta remover a URL do array no MongoDB
        const imovelAtualizado = await this.imovelModel.findOneAndUpdate(
            { _id: imovelId, empresa: empresaId },
            { $pull: { fotos: photoUrl } },
            { new: true }
        );

        // ⭐️ VERIFICAÇÃO DE SEGURANÇA:
        if (!imovelAtualizado) {
            throw new NotFoundException('Imóvel não encontrado ou você não tem permissão.');
        }

        return imovelAtualizado;
    }
}