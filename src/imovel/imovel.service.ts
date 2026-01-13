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
        
        console.log('createImovelDto:', createImovelDto);
        return createdImovel.save();
    }

    async findAll(empresaId: string, search?: string, status?: string): Promise<Imovel[]> {
        const empresaObjectId = this.validateAndConvertId(empresaId, 'ID da Empresa');

        const pipeline: any[] = [
            {
                $match: { empresa: empresaObjectId }
            },
            // ⭐️ CORREÇÃO: Converte proprietario string para ObjectId antes do lookup
            {
                $addFields: {
                    proprietarioObjectId: {
                        $cond: {
                            if: { $eq: [{ $type: "$proprietario" }, "string"] },
                            then: { $toObjectId: "$proprietario" },
                            else: "$proprietario"
                        }
                    }
                }
            },
            {
                $lookup: {
                    from: 'clientes',
                    localField: 'proprietarioObjectId', // ⭐️ Usa o campo convertido
                    foreignField: '_id',
                    as: 'proprietario_info',
                },
            },
            {
                $lookup: {
                    from: 'empresas',
                    localField: 'empresa',
                    foreignField: '_id',
                    as: 'empresa_info',
                },
            },
            { $unwind: '$empresa_info' },
            { $unwind: { path: '$proprietario_info', preserveNullAndEmptyArrays: true } },
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
                para_venda: 1,
                para_aluguel: 1,
                valor_venda: 1,
                valor_aluguel: 1,
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
                // ⭐️ Retorna o proprietário populado ou o ID original
                proprietario: {
                    $cond: {
                        if: { $ifNull: ["$proprietario_info", false] },
                        then: {
                            _id: { $toString: "$proprietario_info._id" },
                            nome: "$proprietario_info.nome"
                        },
                        else: "$proprietario" // Fallback para ID string
                    }
                }
            }
        });

        const result = await this.imovelModel.aggregate(pipeline).exec();
        console.log('findAll - Resultado:', JSON.stringify(result[0]?.proprietario, null, 2));
        return result;
    }

    async findAllPublico(search?: string) {
        const pipeline: any[] = [
            {
                $lookup: {
                    from: 'empresas',
                    localField: 'empresa',
                    foreignField: '_id',
                    as: 'empresa_info',
                },
            },
            // ⭐️ ADICIONADO: Populate do proprietário
            {
                $lookup: {
                    from: 'clientes',
                    localField: 'proprietario',
                    foreignField: '_id',
                    as: 'proprietario_info',
                },
            },
            { $unwind: '$empresa_info' },
            { $unwind: { path: '$proprietario_info', preserveNullAndEmptyArrays: true } },
            {
                $match: {
                    disponivel: true,
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
                para_venda: 1,
                para_aluguel: 1,
                valor_venda: 1,
                valor_aluguel: 1,
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
                // ⭐️ GARANTIR que está incluindo o proprietario:
                proprietario: {
                    $cond: {
                        if: { $eq: [{ $type: "$proprietario_info" }, "object"] },
                        then: {
                            _id: "$proprietario_info._id",
                            nome: "$proprietario_info.nome"
                        },
                        else: "$proprietario" // Mantém o ID se não populou
                    }
                }
            }
        });

        return this.imovelModel.aggregate(pipeline).exec();
    }

    // 3. BUSCA ÚNICA: Filtra por ID do Imóvel E ID da Empresa
    async findOne(imovelId: string, empresaId: string): Promise<any> {
        const empresaObjectId = this.validateAndConvertId(empresaId, 'ID da Empresa');
        const imovelObjectId = this.validateAndConvertId(imovelId, 'ID do Imóvel');

        const result = await this.imovelModel.aggregate([
            {
                $match: {
                    _id: imovelObjectId,
                    empresa: empresaObjectId,
                }
            },
            {
                $addFields: {
                    proprietarioObjectId: {
                        $cond: {
                            if: { $eq: [{ $type: "$proprietario" }, "string"] },
                            then: { $toObjectId: "$proprietario" },
                            else: "$proprietario"
                        }
                    }
                }
            },
            {
                $lookup: {
                    from: 'clientes',
                    localField: 'proprietarioObjectId',
                    foreignField: '_id',
                    as: 'proprietario_info',
                },
            },
            {
                $lookup: {
                    from: 'empresas',
                    localField: 'empresa',
                    foreignField: '_id',
                    as: 'empresa_info',
                },
            },
            { $unwind: '$empresa_info' },
            { $unwind: { path: '$proprietario_info', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    titulo: 1,
                    tipo: 1,
                    endereco: 1,
                    para_venda: 1,
                    para_aluguel: 1,
                    valor_venda: 1,
                    valor_aluguel: 1,
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
                    proprietario: {
                        $cond: {
                            if: { $ifNull: ["$proprietario_info", false] },
                            then: {
                                _id: { $toString: "$proprietario_info._id" },
                                nome: "$proprietario_info.nome"
                            },
                            else: "$proprietario"
                        }
                    }
                }
            }
        ]).exec();

        if (!result || result.length === 0) {
            throw new NotFoundException(`Imóvel não encontrado.`);
        }

        return result[0];
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
        // Validação de IDs para evitar erro de cast do MongoDB
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
            throw new NotFoundException(`Imóvel com ID "${imovelId}" não encontrado.`);
        }

        // Retorno com cast para garantir compatibilidade com a interface
        return imovel as unknown as Imovel;
    }

    // ====================================================================
    // Remover Foto
    // ====================================================================
    async removePhoto(imovelId: string, empresaId: string, photoUrl: string): Promise<Imovel> {
        try {
            // Validação de IDs
            const empresaObjectId = this.validateAndConvertId(empresaId, 'ID da Empresa');
            const imovelObjectId = this.validateAndConvertId(imovelId, 'ID do Imóvel');

            // 1. Remove do Cloudinary primeiro
            // Se o Cloudinary falhar, ele cairá no catch abaixo
            await this.uploadService.deleteImage(photoUrl);

            // 2. Remove a URL do array no MongoDB
            const imovelAtualizado = await this.imovelModel.findOneAndUpdate(
                {
                    _id: imovelObjectId,
                    empresa: empresaObjectId
                },
                { $pull: { fotos: photoUrl } },
                { new: true }
            ).exec();

            if (!imovelAtualizado) {
                throw new NotFoundException('Imóvel não encontrado ou você não tem permissão.');
            }

            return imovelAtualizado as unknown as Imovel;
        } catch (error) {
            // Se for um erro que nós já tratamos (NotFound), repassa ele
            if (error instanceof NotFoundException || error instanceof BadRequestException) {
                throw error;
            }
            // Caso contrário, lança o erro detalhado para evitar o 500 genérico
            throw new Error(`Erro ao processar remoção: ${error.message}`);
        }
    }
}