import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ComissaoRegra, ComissaoRegraDocument } from './schemas/comissaoRegra.schema';
import { CriarRegraComissaoDto } from './dto/criar-regra-comissao.dto';
import { AtualizarRegraComissaoDto } from './dto/atualizar-regra-comissao.dto';

@Injectable()
export class ComissaoRegraService {
    constructor(
        @InjectModel(ComissaoRegra.name) private regraModel: Model<ComissaoRegraDocument>,
    ) { }

    /**
     * Criar nova regra de comissão
     */
    async criarRegra(dto: CriarRegraComissaoDto, usuarioId: string, empresaId: string): Promise<any> {
        // Validar datas
        if (dto.dataInicio && dto.dataFim && new Date(dto.dataFim) < new Date(dto.dataInicio)) {
            throw new BadRequestException('Data fim não pode ser anterior à data início');
        }

        const regra = new this.regraModel({
            ...dto,
            criadoPor: new Types.ObjectId(usuarioId),
            empresa: new Types.ObjectId(empresaId),
            // createdAt e updatedAt são automaticamente gerenciados pelo timestamps: true
        });

        await regra.save();
        return regra;
    }

    /**
     * Listar todas as regras da empresa
     */
    async listarRegras(empresaId: string): Promise<any> {
        console.log('Buscando regras para empresa:', empresaId);

        // Tente ambas as formas
        let query;
        try {
            // Tenta como ObjectId
            const empresaObjectId = new Types.ObjectId(empresaId);
            query = { empresa: empresaObjectId };
        } catch (error) {
            // Se falhar, usa como string
            query = { empresa: empresaId };
        }

        const regras = await this.regraModel.find(query)
            .sort({ prioridade: -1, createdAt: -1 })
            .populate('criadoPor', 'nome email')
            .populate('atualizadoPor', 'nome email')
            .exec();

        console.log('Total de regras encontradas:', regras.length);

        return regras;
    }

    /**
     * Buscar regra por ID
     */
    async buscarRegraPorId(id: string, empresaId: string): Promise<any> {
        const regra = await this.regraModel.findOne({
            _id: new Types.ObjectId(id),
            empresa: new Types.ObjectId(empresaId),
        })
            .populate('criadoPor', 'nome email')
            .populate('atualizadoPor', 'nome email')
            .exec();

        if (!regra) {
            throw new NotFoundException('Regra de comissão não encontrada');
        }

        return regra;
    }

    async atualizarRegra(
        id: string,
        dto: AtualizarRegraComissaoDto,
        usuarioId: string,
        empresaId: string
    ): Promise<any> {
        console.log('=== DEBUG ATUALIZAÇÃO ===');
        console.log('ID:', id);
        console.log('EmpresaID:', empresaId);

        // Prepara query flexível
        const query: any = { _id: new Types.ObjectId(id) };

        // Tenta como ObjectId primeiro
        try {
            query.empresa = new Types.ObjectId(empresaId);
        } catch (error) {
            // Se falhar, tenta como string
            query.empresa = empresaId;
        }

        console.log('Query:', query);

        const regra = await this.regraModel.findOne(query);

        if (!regra) {
            console.log('Regra não encontrada com query:', query);

            // Para debug, veja se existe com apenas o ID
            const regraPorId = await this.regraModel.findById(id);
            console.log('Regra encontrada apenas por ID?', regraPorId ? 'Sim' : 'Não');
            if (regraPorId) {
                console.log('Empresa da regra no banco:', regraPorId.empresa);
                console.log('Tipo empresa no banco:', typeof regraPorId.empresa);
            }

            throw new NotFoundException('Regra de comissão não encontrada');
        }

        console.log('Regra encontrada:', regra);

        // Validar datas
        if (dto.dataInicio && dto.dataFim && new Date(dto.dataFim) < new Date(dto.dataInicio)) {
            throw new BadRequestException('Data fim não pode ser anterior à data início');
        }

        // Atualizar campos do DTO
        Object.assign(regra, dto);

        // Atualizar quem modificou
        regra.atualizadoPor = new Types.ObjectId(usuarioId);

        await regra.save();
        return regra;
    }

    /**
     * Excluir regra
     */
    async excluirRegra(id: string, empresaId: string): Promise<any> {
        console.log('=== DEBUG EXCLUSÃO ===');
        console.log('ID recebido:', id);
        console.log('EmpresaID recebido:', empresaId);
        console.log('Tipo empresaId:', typeof empresaId);

        // Verifique se os IDs são válidos
        let objectId;
        let empresaObjectId;

        try {
            objectId = new Types.ObjectId(id);
            console.log('ID convertido para ObjectId:', objectId);
        } catch (error) {
            console.error('ID inválido:', error.message);
            throw new BadRequestException('ID da regra inválido');
        }

        try {
            empresaObjectId = new Types.ObjectId(empresaId);
            console.log('EmpresaID convertido para ObjectId:', empresaObjectId);
        } catch (error) {
            console.error('EmpresaID inválido:', error.message);
            throw new BadRequestException('ID da empresa inválido');
        }

        // Query correta com ObjectIds
        const query = {
            _id: objectId,
            empresa: empresaObjectId
        };

        console.log('Query final:', query);

        // Primeiro, veja se a regra existe
        const regraExiste = await this.regraModel.findOne(query);
        console.log('Regra encontrada?', regraExiste ? 'Sim' : 'Não');

        if (!regraExiste) {
            // Para debug, veja se existe com ID apenas
            const qualquerRegraComEsteId = await this.regraModel.findById(id);
            console.log('Existe alguma regra com este ID?', qualquerRegraComEsteId ? 'Sim' : 'Não');

            if (qualquerRegraComEsteId) {
                console.log('Empresa da regra encontrada:', qualquerRegraComEsteId.empresa);
                console.log('Tipo empresa da regra:', typeof qualquerRegraComEsteId.empresa);
                console.log('Empresa esperada:', empresaObjectId);
            }

            throw new NotFoundException('Regra de comissão não encontrada ou não pertence a esta empresa');
        }

        const result = await this.regraModel.deleteOne(query);
        console.log('Resultado deleteOne:', result);

        return {
            mensagem: 'Regra excluída com sucesso',
            id,
        };
    }

    /**
     * Ativar/Desativar regra
     */
    async alterarStatusRegra(id: string, ativo: boolean, usuarioId: string, empresaId: string): Promise<any> {
        const regra = await this.regraModel.findOneAndUpdate(
            {
                _id: new Types.ObjectId(id),
                empresa: new Types.ObjectId(empresaId),
            },
            {
                $set: {
                    ativo,
                    atualizadoPor: new Types.ObjectId(usuarioId),
                }
            },
            { new: true }
        );

        if (!regra) {
            throw new NotFoundException('Regra de comissão não encontrada');
        }

        return {
            mensagem: `Regra ${ativo ? 'ativada' : 'desativada'} com sucesso`,
            regra,
        };
    }
    /**
     * Testar aplicação de regras
     */
    async testarRegras(dadosTeste: any, empresaId: string): Promise<any> {
        const { tipoNegocio, cargo, nivel, valor } = dadosTeste;

        // Construir query corretamente
        const query: any = {
            empresa: empresaId,
            ativo: true,
            $and: [] // Usar $and para combinar condições
        };

        // Condição para tipoNegocio
        query.$and.push({
            $or: [
                { tipoNegocio: 'AMBOS' },
                { tipoNegocio: tipoNegocio }
            ]
        });

        // Condição para cargo
        query.$and.push({
            $or: [
                { cargo: { $size: 0 } }, // Sem restrição de cargo
                { cargo: cargo }         // Ou inclui o cargo especificado
            ]
        });

        // Condição para nível
        if (nivel) {
            query.$and.push({
                $or: [
                    { nivel: { $size: 0 } }, // Sem restrição de nível
                    { nivel: nivel }         // Ou inclui o nível especificado
                ]
            });
        }

        // Condição para vigência
        query.$and.push({
            $or: [
                {
                    $and: [
                        { dataInicio: { $lte: new Date() } },
                        { dataFim: { $gte: new Date() } }
                    ]
                },
                {
                    $and: [
                        { dataInicio: { $lte: new Date() } },
                        { dataFim: { $exists: false } }
                    ]
                },
                {
                    $and: [
                        { dataInicio: { $exists: false } },
                        { dataFim: { $gte: new Date() } }
                    ]
                },
                {
                    $and: [
                        { dataInicio: { $exists: false } },
                        { dataFim: { $exists: false } }
                    ]
                }
            ]
        });

        // Buscar regras aplicáveis
        const regras = await this.regraModel.find(query)
            .sort({ prioridade: -1 })
            .exec();

        // Calcular comissões para cada regra
        const resultados = regras.map(regra => {
            let valorComissao = 0;

            switch (regra.tipoCalculo) {
                case 'PERCENTUAL':
                    valorComissao = (valor * regra.percentual) / 100;
                    break;
                case 'FIXO':
                    valorComissao = regra.valorFixo || 0;
                    break;
                case 'MISTO':
                    valorComissao = ((valor * regra.percentual) / 100) + (regra.valorFixo || 0);
                    break;
            }

            return {
                regra: {
                    id: regra._id,
                    nome: regra.nome,
                    tipoCalculo: regra.tipoCalculo,
                    percentual: regra.percentual,
                    valorFixo: regra.valorFixo,
                    prioridade: regra.prioridade,
                },
                calculo: {
                    valorBase: valor,
                    valorComissao,
                    percentualAplicado: regra.percentual,
                }
            };
        });

        // Encontrar a regra com maior prioridade aplicável
        const regraAplicavel = regras.length > 0 ? regras[0] : null;
        let comissaoFinal = 0;

        if (regraAplicavel) {
            switch (regraAplicavel.tipoCalculo) {
                case 'PERCENTUAL':
                    comissaoFinal = (valor * regraAplicavel.percentual) / 100;
                    break;
                case 'FIXO':
                    comissaoFinal = regraAplicavel.valorFixo || 0;
                    break;
                case 'MISTO':
                    comissaoFinal = ((valor * regraAplicavel.percentual) / 100) + (regraAplicavel.valorFixo || 0);
                    break;
            }
        }

        return {
            dadosTeste,
            totalRegrasEncontradas: regras.length,
            regraAplicavel: regraAplicavel ? {
                id: regraAplicavel._id,
                nome: regraAplicavel.nome,
                tipoCalculo: regraAplicavel.tipoCalculo,
            } : null,
            comissaoCalculada: comissaoFinal,
            todasRegras: resultados,
            resumo: {
                valorTestado: valor,
                comissaoFinal,
                percentualEfetivo: valor > 0 ? (comissaoFinal / valor) * 100 : 0,
            }
        };
    }

    /**
     * Buscar regras aplicáveis para um cenário específico
     */
    async buscarRegrasAplicaveis(
        tipoNegocio: 'VENDA' | 'ALUGUEL',
        cargo?: string,
        nivel?: string,
        empresaId?: string
    ): Promise<any[]> {
        const query: any = {
            ativo: true,
            $and: []
        };

        // Condição para empresa
        if (empresaId) {
            query.empresa = empresaId;
        }

        // Condição para tipoNegocio
        query.$and.push({
            $or: [
                { tipoNegocio: 'AMBOS' },
                { tipoNegocio: tipoNegocio }
            ]
        });

        // Condição para cargo
        if (cargo) {
            query.$and.push({
                $or: [
                    { cargo: { $size: 0 } },
                    { cargo: cargo }
                ]
            });
        } else {
            query.$and.push({
                $or: [
                    { cargo: { $size: 0 } }
                ]
            });
        }

        // Condição para nível
        if (nivel) {
            query.$and.push({
                $or: [
                    { nivel: { $size: 0 } },
                    { nivel: nivel }
                ]
            });
        }

        // Condição para vigência
        query.$and.push({
            $or: [
                {
                    $and: [
                        { dataInicio: { $exists: true } },
                        { dataFim: { $exists: true } },
                        { dataInicio: { $lte: new Date() } },
                        { dataFim: { $gte: new Date() } }
                    ]
                },
                {
                    $and: [
                        { dataInicio: { $exists: true } },
                        { dataFim: { $exists: false } },
                        { dataInicio: { $lte: new Date() } }
                    ]
                },
                {
                    $and: [
                        { dataInicio: { $exists: false } },
                        { dataFim: { $exists: true } },
                        { dataFim: { $gte: new Date() } }
                    ]
                },
                {
                    $and: [
                        { dataInicio: { $exists: false } },
                        { dataFim: { $exists: false } }
                    ]
                }
            ]
        });

        return await this.regraModel.find(query)
            .sort({ prioridade: -1 })
            .exec();
    }
}