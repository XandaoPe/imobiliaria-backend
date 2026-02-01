import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { Financeiro, FinanceiroDocument, TipoLancamento, CategoriaLancamento, StatusFinanceiro } from './schemas/financeiro.schema';
import { FinanceiroFiltrosDto } from './dto/financeiro-filtros.dto';
import { Empresa, EmpresaDocument } from 'src/empresa/schemas/empresa.schema';
import { CreateFinanceiroDto } from './dto/create-financeiro.dto';
import { Cliente } from 'src/cliente/schemas/cliente.schema';
import { ConfiguracaoService } from 'src/configuracao/configuracao.service';
import { Imovel } from 'src/imovel/schemas/imovel.schema';
import { UpdateFinanceiroDto } from './dto/update-financeiro.dto';

@Injectable()
export class FinanceiroService {
    constructor(
        @InjectModel(Financeiro.name) private financeiroModel: Model<FinanceiroDocument>,
        @InjectModel(Empresa.name) private empresaModel: Model<EmpresaDocument>,
        @InjectModel(Cliente.name) private clienteModel: Model<any>,
        @InjectModel(Imovel.name) private imovelModel: Model<any>,
        private readonly configService: ConfiguracaoService,
    ) { }

    private criarFiltroDataString(dataInicio?: string, dataFim?: string): any {
        const filtro: any = {};

        if (dataInicio) {
            filtro.$gte = dataInicio; // "2026-01-19" >= "2026-01-19"
        }

        if (dataFim) {
            filtro.$lte = dataFim; // "2026-02-24" <= "2026-02-24"
        }

        return filtro;
    }

    async create(createDto: CreateFinanceiroDto, empresaId: string) {
        const novoLancamento = new this.financeiroModel({
            ...createDto,
            empresa: new Types.ObjectId(empresaId),
        });
        return await novoLancamento.save();
    }

    async findAllByEmpresa(empresaId: string, filtros: FinanceiroFiltrosDto) {
        const {
            page = 1,
            limit = 10,
            search,
            status,
            tipo,
            categoria,
            dataInicio,
            dataFim,
            valorMin,
            valorMax,
            imovelCodigo,
            negociacaoCodigo
        } = filtros;

        const skip = (page - 1) * limit;

        const query: FilterQuery<FinanceiroDocument> = {
            empresa: new Types.ObjectId(empresaId),
            status: { $ne: StatusFinanceiro.CANCELADO }
        };

        // Filtro por Status (agora suporta múltiplos valores separados por vírgula)
        if (status && status !== 'TODOS') {
            const statusArray = status.split(',').map(s => s.trim()).filter(s => s !== '');
            if (statusArray.length > 0) {
                query.status = { $in: statusArray };
            }
        }

        // Filtro por Tipo
        if (tipo) {
            query.tipo = tipo;
        }

        // Filtro por Categoria (agora suporta múltiplos valores separados por vírgula)
        if (categoria && categoria !== 'TODOS') {
            const categoriaArray = categoria.split(',').map(c => c.trim()).filter(c => c !== '');
            if (categoriaArray.length > 0) {
                query.categoria = { $in: categoriaArray };
            }
        }

        // Filtro por Data
        if (dataInicio || dataFim) {
            query.dataVencimento = this.criarFiltroDataString(dataInicio, dataFim);
        }

        // Filtro por Valor Mínimo/Máximo
        if (valorMin !== undefined || valorMax !== undefined) {
            query.valor = {};
            if (valorMin !== undefined) {
                query.valor.$gte = valorMin;
            }
            if (valorMax !== undefined) {
                query.valor.$lte = valorMax;
            }
        }

        // Filtro por Código da Negociação
        if (negociacaoCodigo) {
            query.negociacaoCodigo = { $regex: negociacaoCodigo, $options: 'i' };
        }

        // Filtro por Código do Imóvel
        if (imovelCodigo) {
            const imoveis = await this.imovelModel.find({
                empresa: new Types.ObjectId(empresaId),
                codigo: { $regex: imovelCodigo, $options: 'i' }
            }).select('_id').lean();

            if (imoveis.length > 0) {
                query.imovel = { $in: imoveis.map(i => i._id) };
            }
        }

        // Filtro por Search
        if (search) {
            const clientesEncontrados = await this.clienteModel.find({
                nome: { $regex: search, $options: 'i' },
                empresa: new Types.ObjectId(empresaId)
            }).select('_id').lean();

            const idsClientes = clientesEncontrados.map(c => c._id);

            query.$or = [
                { descricao: { $regex: search, $options: 'i' } },
                { negociacaoCodigo: { $regex: search, $options: 'i' } },
                { cliente: { $in: idsClientes } }
            ];
        }

        const [data, total] = await Promise.all([
            this.financeiroModel
                .find(query)
                .sort({ dataVencimento: 1 })
                .skip(skip)
                .limit(limit)
                .populate('cliente', 'nome telefone')
                .populate('comissionado', 'nome email')
                .populate({
                    path: 'imovel',
                    select: 'titulo endereco cidade proprietario codigo',
                    populate: {
                        path: 'proprietario',
                        model: 'Cliente',
                        select: 'nome email telefone'
                    }
                })
                .lean(),
            this.financeiroModel.countDocuments(query),
        ]);

        return {
            data,
            total,
            page,
            lastPage: Math.ceil(total / limit),
        };
    }

    async getResumo(empresaId: string, filtros: FinanceiroFiltrosDto) {
        const {
            status,
            tipo,
            categoria,
            dataInicio,
            dataFim,
            valorMin,
            valorMax,
            imovelCodigo,
            negociacaoCodigo,
            search
        } = filtros;

        const matchFiltro: any = {
            empresa: new Types.ObjectId(empresaId),
            status: { $ne: StatusFinanceiro.CANCELADO }
        };

        // Filtro por Status (agora suporta múltiplos valores)
        if (status && status !== 'TODOS') {
            const statusArray = status.split(',').map(s => s.trim()).filter(s => s !== '');
            if (statusArray.length > 0) {
                matchFiltro.status = { $in: statusArray };
            }
        }

        // Filtro por Tipo
        if (tipo) {
            matchFiltro.tipo = tipo;
        }

        // Filtro por Categoria (agora suporta múltiplos valores)
        if (categoria && categoria !== 'TODOS') {
            const categoriaArray = categoria.split(',').map(c => c.trim()).filter(c => c !== '');
            if (categoriaArray.length > 0) {
                matchFiltro.categoria = { $in: categoriaArray };
            }
        }

        // Filtro por Data
        if (dataInicio || dataFim) {
            matchFiltro.dataVencimento = this.criarFiltroDataString(dataInicio, dataFim);
        }

        // Filtro por Valor
        if (valorMin !== undefined || valorMax !== undefined) {
            matchFiltro.valor = {};
            if (valorMin !== undefined) {
                matchFiltro.valor.$gte = valorMin;
            }
            if (valorMax !== undefined) {
                matchFiltro.valor.$lte = valorMax;
            }
        }

        // Filtro por Código da Negociação
        if (negociacaoCodigo) {
            matchFiltro.negociacaoCodigo = { $regex: negociacaoCodigo, $options: 'i' };
        }

        // Filtro por Código do Imóvel
        if (imovelCodigo) {
            const imoveis = await this.imovelModel.find({
                empresa: new Types.ObjectId(empresaId),
                codigo: { $regex: imovelCodigo, $options: 'i' }
            }).select('_id').lean();

            if (imoveis.length > 0) {
                matchFiltro.imovel = { $in: imoveis.map(i => i._id) };
            }
        }

        // Filtro por Search
        if (search) {
            const clientesEncontrados = await this.clienteModel.find({
                nome: { $regex: search, $options: 'i' },
                empresa: new Types.ObjectId(empresaId)
            }).select('_id').lean();

            const idsClientes = clientesEncontrados.map(c => c._id);

            matchFiltro.$or = [
                { descricao: { $regex: search, $options: 'i' } },
                { negociacaoCodigo: { $regex: search, $options: 'i' } },
                { cliente: { $in: idsClientes } }
            ];
        }

        const pipeline = [
            { $match: matchFiltro },
            {
                $facet: {
                    totais: [
                        {
                            $group: {
                                _id: null,
                                receitas: {
                                    $sum: {
                                        $cond: [
                                            { $eq: ["$tipo", TipoLancamento.RECEITA] },
                                            "$valor",
                                            0
                                        ]
                                    }
                                },
                                despesas: {
                                    $sum: {
                                        $cond: [
                                            { $eq: ["$tipo", TipoLancamento.DESPESA] },
                                            "$valor",
                                            0
                                        ]
                                    }
                                },
                                receitasPagas: {
                                    $sum: {
                                        $cond: [
                                            {
                                                $and: [
                                                    { $eq: ["$tipo", TipoLancamento.RECEITA] },
                                                    { $eq: ["$status", StatusFinanceiro.PAGO] }
                                                ]
                                            },
                                            "$valor",
                                            0
                                        ]
                                    }
                                },
                                despesasPagas: {
                                    $sum: {
                                        $cond: [
                                            {
                                                $and: [
                                                    { $eq: ["$tipo", TipoLancamento.DESPESA] },
                                                    { $eq: ["$status", StatusFinanceiro.PAGO] }
                                                ]
                                            },
                                            "$valor",
                                            0
                                        ]
                                    }
                                },
                                receitasPendentes: {
                                    $sum: {
                                        $cond: [
                                            {
                                                $and: [
                                                    { $eq: ["$tipo", TipoLancamento.RECEITA] },
                                                    { $eq: ["$status", StatusFinanceiro.PENDENTE] }
                                                ]
                                            },
                                            "$valor",
                                            0
                                        ]
                                    }
                                },
                                despesasPendentes: {
                                    $sum: {
                                        $cond: [
                                            {
                                                $and: [
                                                    { $eq: ["$tipo", TipoLancamento.DESPESA] },
                                                    { $eq: ["$status", StatusFinanceiro.PENDENTE] }
                                                ]
                                            },
                                            "$valor",
                                            0
                                        ]
                                    }
                                }
                            }
                        }
                    ]
                }
            }
        ];

        const resultado = await this.financeiroModel.aggregate(pipeline);
        const totais = resultado[0]?.totais[0] || {
            receitas: 0,
            despesas: 0,
            receitasPagas: 0,
            despesasPagas: 0,
            receitasPendentes: 0,
            despesasPendentes: 0
        };

        return {
            receitas: totais.receitasPagas,
            despesas: totais.despesasPagas,
            pendentes: totais.receitasPendentes,
            receitasBruto: totais.receitas,
            despesasBruto: totais.despesas,
            receitasPendentes: totais.receitasPendentes,
            despesasPendentes: totais.despesasPendentes
        };
    }

    async gerarFluxoFinanceiroFechamento(negociacao: any, imovel: any, financeiroData: any) {
        try {
            const lancamentos: any[] = [];
            const {
                valorEntrada,
                qtdParcelas,
                valorParcela,
                diaVencimento,
                comissoes = [] // NOVO: recebe as comissões
            } = financeiroData;

            const empresaIdStr = negociacao.empresa.toString();
            const empresaId = new Types.ObjectId(negociacao.empresa);
            const negociacaoId = new Types.ObjectId(negociacao._id);
            const imovelId = new Types.ObjectId(imovel._id);
            const clienteId = new Types.ObjectId(negociacao.cliente._id || negociacao.cliente);
            const proprietarioId = imovel.proprietario?._id ? new Types.ObjectId(imovel.proprietario._id) : (imovel.proprietario ? new Types.ObjectId(imovel.proprietario) : null);

            const diaEscolhido = Number(diaVencimento) || new Date().getDate();
            const codNeg = negociacao.codigo || 'S/COD';

            const chaveConfig = negociacao.tipo === 'VENDA' ? 'TAXA_VENDA' : 'TAXA_ADM_ALUGUEL';

            let taxaAdmDecimal = 0.10;
            try {
                const configTaxa = await this.configService.findByChave(chaveConfig, empresaIdStr);
                if (configTaxa && configTaxa.valor) {
                    taxaAdmDecimal = configTaxa.valor / 100;
                }
            } catch (error) {
                console.log(`Taxa ${chaveConfig} não encontrada, usando padrão 10%`);
            }

            // Data atual como string YYYY-MM-DD
            const dataAtualStr = new Date().toISOString().split('T')[0];

            // 1. Entrada (se houver)
            if (Number(valorEntrada) > 0) {
                lancamentos.push({
                    empresa: empresaId,
                    negociacao: negociacaoId,
                    negociacaoCodigo: codNeg,
                    imovel: imovelId,
                    cliente: clienteId,
                    tipo: TipoLancamento.RECEITA,
                    categoria: negociacao.tipo === 'VENDA' ? CategoriaLancamento.VENDA : CategoriaLancamento.ALUGUEL,
                    valor: Number(valorEntrada),
                    valorPago: Number(valorEntrada),
                    dataVencimento: dataAtualStr,
                    dataPagamento: dataAtualStr,
                    status: StatusFinanceiro.PAGO,
                    descricao: `[${codNeg}] Entrada - ${negociacao.tipo} - Imóvel ${imovel.codigo || 'S/R'}`,
                    observacoes: 'Gerado automaticamente no fechamento.'
                });
            }

            // 2. Parcelas e repasses
            const hoje = new Date();
            const anoAtual = hoje.getFullYear();
            const mesAtual = hoje.getMonth();

            for (let i = 1; i <= qtdParcelas; i++) {
                const mesAlvo = mesAtual + i;
                const anoAlvo = anoAtual + Math.floor(mesAlvo / 12);
                const mesAjustado = mesAlvo % 12;

                // Criar data no fuso local
                const dataVencimentoDate = new Date(anoAlvo, mesAjustado, diaEscolhido);

                // Ajustar se o dia não existe
                if (dataVencimentoDate.getMonth() !== mesAjustado) {
                    dataVencimentoDate.setDate(0); // Último dia do mês anterior
                }

                // Converter para string YYYY-MM-DD
                const dataVencimentoStr = dataVencimentoDate.toISOString().split('T')[0];

                // Parcela do cliente
                lancamentos.push({
                    empresa: empresaId,
                    negociacao: negociacaoId,
                    negociacaoCodigo: codNeg,
                    imovel: imovelId,
                    cliente: clienteId,
                    tipo: TipoLancamento.RECEITA,
                    categoria: negociacao.tipo === 'VENDA' ? CategoriaLancamento.VENDA : CategoriaLancamento.ALUGUEL,
                    valor: Number(valorParcela),
                    dataVencimento: dataVencimentoStr,
                    status: StatusFinanceiro.PENDENTE,
                    parcelaNumero: i,
                    descricao: `Parcela ${i}/${qtdParcelas} - ${negociacao.tipo}`,
                });

                // Repasse para proprietário
                if (proprietarioId) {
                    const valorRepasse = Number(valorParcela) * (1 - taxaAdmDecimal);
                    lancamentos.push({
                        empresa: empresaId,
                        negociacao: negociacaoId,
                        negociacaoCodigo: codNeg,
                        imovel: imovelId,
                        cliente: proprietarioId,
                        tipo: TipoLancamento.DESPESA,
                        categoria: CategoriaLancamento.REPASSE,
                        valor: Number(valorRepasse.toFixed(2)),
                        dataVencimento: dataVencimentoStr,
                        status: StatusFinanceiro.PENDENTE,
                        parcelaNumero: i,
                        descricao: `Repasse Parcela ${i}/${qtdParcelas} (${(taxaAdmDecimal * 100).toFixed(1)}% taxa)`,
                    });
                }
            }

            if (comissoes && comissoes.length > 0) {
                comissoes.forEach((comissao: any) => {
                    lancamentos.push({
                        empresa: empresaId,
                        negociacao: negociacaoId,
                        negociacaoCodigo: codNeg,
                        imovel: imovelId,
                        cliente: proprietarioId, // Mantém o proprietário como cliente
                        comissionado: new Types.ObjectId(comissao.usuarioId), // NOVO CAMPO
                        tipo: TipoLancamento.DESPESA,
                        categoria: CategoriaLancamento.COMISSAO,
                        valor: Number(comissao.valorCalculado),
                        dataVencimento: dataAtualStr,
                        status: StatusFinanceiro.PENDENTE,
                        descricao: `Comissão ${negociacao.tipo} - ${comissao.usuarioNome}`, 
                        observacoes: `Regra: ${comissao.regraNome} (${comissao.percentual}%)` 
                    });
                });
            }

            console.log('=== DATAS CRIADAS ===');
            lancamentos.forEach((l, i) => {
                console.log(`Lançamento ${i + 1}:`, {
                    dataVencimento: l.dataVencimento,
                    descricao: l.descricao,
                    tipo: l.tipo,
                    categoria: l.categoria
                });
            });

            if (lancamentos.length === 0) return [];
            return await this.financeiroModel.insertMany(lancamentos);
        } catch (error) {
            console.error('Erro ao gerar fluxo financeiro:', error);
            throw new BadRequestException('Não foi possível gerar os lançamentos financeiros.');
        }
    }

    async findById(id: string, empresaId: string) {
        const lancamento = await this.financeiroModel
            .findOne({
                _id: new Types.ObjectId(id),
                empresa: new Types.ObjectId(empresaId)
            })
            .populate('cliente', 'nome telefone')
            .populate('comissionado', 'nome email')
            .populate({
                path: 'imovel',
                select: 'titulo endereco cidade proprietario codigo',
                populate: {
                    path: 'proprietario',
                    model: 'Cliente',
                    select: 'nome email telefone'
                }
            })
            .lean();

        if (!lancamento) {
            throw new NotFoundException('Lançamento financeiro não encontrado.');
        }

        return lancamento;
    }

    async update(id: string, empresaId: string, updateDto: UpdateFinanceiroDto) {
        // Verificar se o lançamento existe e pertence à empresa
        const lancamentoExistente = await this.financeiroModel.findOne({
            _id: new Types.ObjectId(id),
            empresa: new Types.ObjectId(empresaId)
        });

        if (!lancamentoExistente) {
            throw new NotFoundException('Lançamento financeiro não encontrado.');
        }

        // Validar restrições de edição
        const restricoes = this.validarRestricoesEdicao(lancamentoExistente, updateDto);
        if (!restricoes.podeEditar) {
            throw new BadRequestException(restricoes.mensagem);
        }

        // Preparar dados para atualização
        const updateData: any = { ...updateDto };

        // Converter IDs de string para ObjectId se necessário
        if (updateData.imovel && typeof updateData.imovel === 'string') {
            updateData.imovel = new Types.ObjectId(updateData.imovel);
        }

        if (updateData.cliente && typeof updateData.cliente === 'string') {
            updateData.cliente = new Types.ObjectId(updateData.cliente);
        }

        // Lógica para status PAGO
        if (updateData.status === StatusFinanceiro.PAGO && !updateData.dataPagamento) {
            updateData.dataPagamento = new Date().toISOString().split('T')[0];
        }

        // Se estiver alterando para PENDENTE e havia dataPagamento, remover
        if (updateData.status === StatusFinanceiro.PENDENTE && updateData.dataPagamento) {
            updateData.dataPagamento = undefined;
            updateData.valorPago = undefined;
        }

        // Manter campos imutáveis
        delete updateData.empresa;
        delete updateData.negociacao;
        delete updateData.negociacaoCodigo;
        delete updateData.comissoesDistribuidas;
        delete updateData.distribuicaoComissao;
        delete updateData.createdAt;
        delete updateData.updatedAt;

        // Atualizar
        const lancamentoAtualizado = await this.financeiroModel.findOneAndUpdate(
            { _id: new Types.ObjectId(id), empresa: new Types.ObjectId(empresaId) },
            { $set: updateData },
            { new: true }
        )
            .populate('cliente', 'nome telefone')
            .populate('comissionado', 'nome email')
            .populate({
                path: 'imovel',
                select: 'titulo endereco cidade proprietario codigo',
                populate: {
                    path: 'proprietario',
                    model: 'Cliente',
                    select: 'nome email telefone'
                }
            })
            .lean();

        return lancamentoAtualizado;
    }

    async cancelarLancamento(id: string, empresaId: string) {
        // Verificar se o lançamento existe
        const lancamentoExistente = await this.financeiroModel.findOne({
            _id: new Types.ObjectId(id),
            empresa: new Types.ObjectId(empresaId)
        });

        if (!lancamentoExistente) {
            throw new NotFoundException('Lançamento financeiro não encontrado.');
        }

        // Não permitir cancelar se já estiver cancelado
        if (lancamentoExistente.status === StatusFinanceiro.CANCELADO) {
            throw new BadRequestException('Este lançamento já está cancelado.');
        }

        // Não permitir cancelar se já estiver pago
        if (lancamentoExistente.status === StatusFinanceiro.PAGO) {
            throw new BadRequestException('Não é possível cancelar um lançamento já pago.');
        }

        // Verificar se é vinculado a negociação (restrições adicionais)
        if (lancamentoExistente.negociacao) {
            // Aqui você pode adicionar lógica adicional se necessário
            // Por exemplo, verificar se a negociação ainda está ativa
        }

        // Atualizar para cancelado
        const updateData = {
            status: StatusFinanceiro.CANCELADO,
            dataCancelamento: new Date().toISOString().split('T')[0]
        };

        const lancamentoCancelado = await this.financeiroModel.findOneAndUpdate(
            { _id: new Types.ObjectId(id), empresa: new Types.ObjectId(empresaId) },
            { $set: updateData },
            { new: true }
        )
            .populate('cliente', 'nome telefone')
            .populate('comissionado', 'nome email')
            .populate({
                path: 'imovel',
                select: 'titulo endereco cidade proprietario codigo',
                populate: {
                    path: 'proprietario',
                    model: 'Cliente',
                    select: 'nome email telefone'
                }
            })
            .lean();

        return lancamentoCancelado;
    }

    private validarRestricoesEdicao(lancamentoExistente: any, updateDto: UpdateFinanceiroDto): { podeEditar: boolean; mensagem?: string } {
        // Se tiver negociação vinculada, restrições são maiores
        if (lancamentoExistente.negociacao) {
            // Não permitir alterar tipo se for de negociação
            if (updateDto.tipo && updateDto.tipo !== lancamentoExistente.tipo) {
                return {
                    podeEditar: false,
                    mensagem: 'Não é possível alterar o tipo de um lançamento vinculado a uma negociação.'
                };
            }

            // Não permitir alterar categoria se for de negociação (exceto para COMISSÃO)
            if (updateDto.categoria && updateDto.categoria !== lancamentoExistente.categoria) {
                return {
                    podeEditar: false,
                    mensagem: 'Não é possível alterar a categoria de um lançamento vinculado a uma negociação.'
                };
            }

            // Não permitir alterar cliente/imovel se for de negociação
            if (updateDto.cliente || updateDto.imovel) {
                return {
                    podeEditar: false,
                    mensagem: 'Não é possível alterar cliente ou imóvel de um lançamento vinculado a uma negociação.'
                };
            }
        }

        // Se já tiver comissões distribuídas, não permitir alterar valor ou categoria COMISSAO
        if (lancamentoExistente.comissoesDistribuidas && lancamentoExistente.categoria === 'COMISSAO') {
            if (updateDto.valor || updateDto.categoria) {
                return {
                    podeEditar: false,
                    mensagem: 'Não é possível alterar valor ou categoria de uma comissão já distribuída.'
                };
            }
        }

        return { podeEditar: true };
    }
    
    async registrarPagamento(id: string, empresaId: string, dadosBaixa?: any) {
        const updateData: any = {
            status: StatusFinanceiro.PAGO,
            dataPagamento: dadosBaixa?.dataPagamento || new Date().toISOString().split('T')[0],
            valorPago: dadosBaixa?.valorPago,
            observacoes: dadosBaixa?.observacoes
        };
        return this.financeiroModel.findOneAndUpdate(
            { _id: new Types.ObjectId(id), empresa: new Types.ObjectId(empresaId) },
            { $set: updateData },
            { new: true }
        ).exec();
    }

    async buscarDadosParaRecibo(id: string, empresaId: string) {
        const lancamento = await this.financeiroModel
            .findOne({ _id: new Types.ObjectId(id), empresa: new Types.ObjectId(empresaId) })
            .populate('cliente', 'nome')
            .exec();
        const empresa = await this.empresaModel.findById(new Types.ObjectId(empresaId)).exec();
        if (!lancamento || !empresa) throw new NotFoundException('Dados insuficientes.');
        return { lancamento, empresa };
    }

    async buscarDadosParaReciboSimples(id: string) {
        const lancamento = await this.financeiroModel.findById(new Types.ObjectId(id)).populate('cliente', 'nome').exec();
        if (!lancamento) return null;
        const empresa = await this.empresaModel.findById(lancamento.empresa).exec();
        return { lancamento, empresa };
    }

    async cancelarParcelasPendentes(negociacaoId: string, empresaId: string) {
        return await this.financeiroModel.updateMany(
            {
                negociacao: new Types.ObjectId(negociacaoId),
                empresa: new Types.ObjectId(empresaId),
                status: StatusFinanceiro.PENDENTE
            },
            { $set: { status: StatusFinanceiro.CANCELADO } }
        );
    }

}