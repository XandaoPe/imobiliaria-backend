import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, FilterQuery } from 'mongoose';
import { Imovel, ImovelDocument } from './schemas/imovel.schema';
import { CreateImovelDto } from './dto/create-imovel.dto';
import { UpdateImovelDto } from './dto/update-imovel.dto';
import { UploadService } from 'src/upload/upload.service';
import { PerfisEnum, Usuario, UsuarioDocument } from 'src/usuario/schemas/usuario.schema';

@Injectable()
export class ImovelService {
    constructor(
        @InjectModel(Imovel.name) private imovelModel: Model<ImovelDocument>,
        private readonly uploadService: UploadService,
        @InjectModel(Usuario.name) private usuarioModel: Model<UsuarioDocument>
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

    async create(createImovelDto: CreateImovelDto, empresaId: string): Promise<Imovel> {
        const empresaObjectId = this.validateAndConvertId(empresaId, 'ID da Empresa');

        const imovelData: any = {
            ...createImovelDto,
            empresa: empresaObjectId,
        };

        // ⭐️ Converte o ID do corretor se fornecido
        if (createImovelDto.corretor) {
            imovelData.corretor = this.validateAndConvertId(createImovelDto.corretor, 'ID do Corretor');
        }

        const createdImovel = new this.imovelModel(imovelData);
        return createdImovel.save();
    }

    async findAll(empresaId: string, search?: string, status?: string): Promise<Imovel[]> {
        const empresaObjectId = this.validateAndConvertId(empresaId, 'ID da Empresa');

        const pipeline: any[] = [
            {
                $match: { empresa: empresaObjectId }
            },
            // ⭐️ CORREÇÃO: Converte proprietario string para ObjectId
            {
                $addFields: {
                    proprietarioObjectId: {
                        $cond: {
                            if: { $eq: [{ $type: "$proprietario" }, "string"] },
                            then: { $toObjectId: "$proprietario" },
                            else: "$proprietario"
                        }
                    },
                    // ⭐️ NOVO: Converte corretor string para ObjectId
                    corretorObjectId: {
                        $cond: {
                            if: { $eq: [{ $type: "$corretor" }, "string"] },
                            then: { $toObjectId: "$corretor" },
                            else: "$corretor"
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
            // ⭐️ NOVO: Lookup para o corretor
            {
                $lookup: {
                    from: 'usuarios',
                    localField: 'corretorObjectId',
                    foreignField: '_id',
                    as: 'corretor_info',
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
            { $unwind: { path: '$corretor_info', preserveNullAndEmptyArrays: true } }, // ⭐️ NOVO
        ];

        // Filtro de Status
        if (status) {
            const isDisponivel = status.toUpperCase() === 'DISPONIVEL';
            pipeline.push({ $match: { disponivel: isDisponivel } });
        }

        // Busca Textual
        if (search) {
            const regex = new RegExp(search, 'i');
            pipeline.push({
                $match: {
                    $or: [
                        { titulo: { $regex: regex } },
                        { endereco: { $regex: regex } },
                        { cidade: { $regex: regex } },
                        { descricao: { $regex: regex } },
                        { 'empresa_info.nome': { $regex: regex } },
                        { 'corretor_info.nome': { $regex: regex } }, // ⭐️ NOVO: busca por nome do corretor
                        { 'corretor_info.email': { $regex: regex } }, // ⭐️ NOVO: busca por email do corretor
                    ],
                },
            });
        }

        // Projeta os dados
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
                proprietario: {
                    $cond: {
                        if: { $ifNull: ["$proprietario_info", false] },
                        then: {
                            _id: { $toString: "$proprietario_info._id" },
                            nome: "$proprietario_info.nome"
                        },
                        else: "$proprietario"
                    }
                },
                // ⭐️ NOVO: Projeta o corretor
                corretor: {
                    $cond: {
                        if: { $ifNull: ["$corretor_info", false] },
                        then: {
                            _id: { $toString: "$corretor_info._id" },
                            nome: "$corretor_info.nome",
                            email: "$corretor_info.email",
                            perfil: "$corretor_info.perfil"
                        },
                        else: "$corretor"
                    }
                }
            }
        });

        const result = await this.imovelModel.aggregate(pipeline).exec();
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
            {
                $lookup: {
                    from: 'clientes',
                    localField: 'proprietario',
                    foreignField: '_id',
                    as: 'proprietario_info',
                },
            },
            // ⭐️ NOVO: Lookup para corretor na busca pública
            {
                $lookup: {
                    from: 'usuarios',
                    localField: 'corretor',
                    foreignField: '_id',
                    as: 'corretor_info',
                },
            },
            { $unwind: '$empresa_info' },
            { $unwind: { path: '$proprietario_info', preserveNullAndEmptyArrays: true } },
            { $unwind: { path: '$corretor_info', preserveNullAndEmptyArrays: true } }, // ⭐️ NOVO
            {
                $match: {
                    disponivel: true,
                },
            },
        ];

        if (search) {
            const regex = new RegExp(search, 'i');
            pipeline.push({
                $match: {
                    $or: [
                        { titulo: { $regex: regex } },
                        { cidade: { $regex: regex } },
                        { endereco: { $regex: regex } },
                        { descricao: { $regex: regex } },
                        { 'empresa_info.nome': { $regex: regex } },
                        { 'corretor_info.nome': { $regex: regex } }, // ⭐️ NOVO
                    ],
                },
            });
        }

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
                proprietario: {
                    $cond: {
                        if: { $eq: [{ $type: "$proprietario_info" }, "object"] },
                        then: {
                            _id: "$proprietario_info._id",
                            nome: "$proprietario_info.nome"
                        },
                        else: "$proprietario"
                    }
                },
                // ⭐️ NOVO: Projeta o corretor na busca pública
                corretor: {
                    $cond: {
                        if: { $eq: [{ $type: "$corretor_info" }, "object"] },
                        then: {
                            _id: "$corretor_info._id",
                            nome: "$corretor_info.nome",
                            email: "$corretor_info.email"
                        },
                        else: "$corretor"
                    }
                }
            }
        });

        return this.imovelModel.aggregate(pipeline).exec();
    }

    async findUsuariosPorEmpresa(empresaId: string, perfil?: PerfisEnum): Promise<any[]> {
        const empresaObjectId = this.validateAndConvertId(empresaId, 'ID da Empresa');

        // Cria o filtro base
        const filtro: any = {
            empresa: empresaObjectId,
            ativo: true
        };

        // Adiciona filtro por perfil se especificado
        if (perfil && Object.values(PerfisEnum).includes(perfil)) {
            filtro.perfil = perfil;
        }

        const usuarios = await this.usuarioModel
            .find(filtro)
            .select('nome email perfil ativo')
            .exec();

        return usuarios.map(usuario => {
            const obj = usuario.toObject();
            return {
                id: obj._id ? obj._id.toString() : obj.id,
                _id: obj._id ? obj._id.toString() : obj.id,
                nome: obj.nome,
                email: obj.email,
                perfil: obj.perfil,
                ativo: obj.ativo
            };
        });
    }

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
                    },
                    // ⭐️ NOVO: Converte corretor
                    corretorObjectId: {
                        $cond: {
                            if: { $eq: [{ $type: "$corretor" }, "string"] },
                            then: { $toObjectId: "$corretor" },
                            else: "$corretor"
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
            // ⭐️ NOVO: Lookup para corretor
            {
                $lookup: {
                    from: 'usuarios',
                    localField: 'corretorObjectId',
                    foreignField: '_id',
                    as: 'corretor_info',
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
            { $unwind: { path: '$corretor_info', preserveNullAndEmptyArrays: true } }, // ⭐️ NOVO
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
                    },
                    // ⭐️ NOVO: Projeta o corretor
                    corretor: {
                        $cond: {
                            if: { $ifNull: ["$corretor_info", false] },
                            then: {
                                _id: { $toString: "$corretor_info._id" },
                                nome: "$corretor_info.nome",
                                email: "$corretor_info.email",
                                perfil: "$corretor_info.perfil"
                            },
                            else: "$corretor"
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
        const empresaObjectId = this.validateAndConvertId(empresaId, 'ID da Empresa');
        const imovelObjectId = this.validateAndConvertId(imovelId, 'ID do Imóvel');

        const updateData: any = { ...updateImovelDto };

        // ⭐️ Converte o ID do corretor se fornecido
        if (updateImovelDto.corretor !== undefined) {
            if (updateImovelDto.corretor) {
                updateData.corretor = this.validateAndConvertId(updateImovelDto.corretor, 'ID do Corretor');
            } else {
                // Se for null ou string vazia, remove o corretor
                updateData.corretor = null;
            }
        }

        const updatedImovel = await this.imovelModel
            .findOneAndUpdate(
                {
                    _id: imovelObjectId,
                    empresa: empresaObjectId
                },
                updateData,
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