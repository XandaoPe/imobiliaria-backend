// src/financeiro/financeiro.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Financeiro, FinanceiroDocument, TipoLancamento, CategoriaLancamento } from './schemas/financeiro.schema';
import { FinanceiroFiltrosDto } from './dto/financeiro-filtros.dto';
import { Empresa, EmpresaDocument } from 'src/empresa/schemas/empresa.schema';
import { CreateFinanceiroDto } from './dto/create-financeiro.dto';

@Injectable()
export class FinanceiroService {
    constructor(
        @InjectModel(Financeiro.name) private financeiroModel: Model<FinanceiroDocument>,
        @InjectModel(Empresa.name) private empresaModel: Model<EmpresaDocument>,
    ) { }

    async create(createDto: CreateFinanceiroDto, empresaId: string) {
        const novoLancamento = new this.financeiroModel({
            ...createDto,
            empresa: new Types.ObjectId(empresaId),
        });
        return await novoLancamento.save();
    }

    async gerarFluxoFinanceiroFechamento(
        negociacao: any,
        imovel: any,
        financeiroData: {
            valorTotal: number;
            valorEntrada: number;
            qtdParcelas: number;
            valorParcela: number;
            diaVencimento?: number;
        }
    ) {
        try {
            const lancamentos: any[] = [];
            const { valorEntrada, qtdParcelas, valorParcela, diaVencimento } = financeiroData;

            // Garantia de IDs formatados corretamente para o MongoDB
            const empresaId = new Types.ObjectId(negociacao.empresa);
            const negociacaoId = new Types.ObjectId(negociacao._id);
            const imovelId = new Types.ObjectId(imovel._id);
            const clienteId = new Types.ObjectId(negociacao.cliente._id || negociacao.cliente);
            const proprietarioId = imovel.proprietario?._id ? new Types.ObjectId(imovel.proprietario._id) : (imovel.proprietario ? new Types.ObjectId(imovel.proprietario) : null);

            const diaEscolhido = Number(diaVencimento) || new Date().getDate();
            const codNeg = negociacao.codigo || 'S/COD';

            // 1. GERAÇÃO DA ENTRADA
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
                    dataVencimento: new Date(),
                    dataPagamento: new Date(),
                    status: 'PAGO',
                    descricao: `[${codNeg}] Entrada - ${negociacao.tipo} - Imóvel ${imovel.codigo || 'S/R'}`,
                    observacoes: 'Gerado automaticamente no fechamento.'
                });
            }

            // 2. GERAÇÃO DAS PARCELAS
            const hoje = new Date();
            // Ajustamos para o meio do dia para evitar problemas de fuso horário que mudam o dia
            hoje.setHours(12, 0, 0, 0);

            for (let i = 1; i <= qtdParcelas; i++) {
                const anoAlvo = hoje.getFullYear();
                const mesAlvo = hoje.getMonth() + i;

                // Lógica de Vencimento com tratamento de meses curtos
                let dataVencimento = new Date(anoAlvo, mesAlvo, diaEscolhido, 12, 0, 0);

                if (dataVencimento.getMonth() !== (mesAlvo % 12)) {
                    dataVencimento = new Date(anoAlvo, mesAlvo + 1, 0, 12, 0, 0);
                }

                // Lançamento da Receita (Cliente -> Empresa)
                lancamentos.push({
                    empresa: empresaId,
                    negociacao: negociacaoId,
                    negociacaoCodigo: codNeg,
                    imovel: imovelId,
                    cliente: clienteId,
                    tipo: TipoLancamento.RECEITA,
                    categoria: negociacao.tipo === 'VENDA' ? CategoriaLancamento.VENDA : CategoriaLancamento.ALUGUEL,
                    valor: Number(valorParcela),
                    dataVencimento: new Date(dataVencimento),
                    status: 'PENDENTE',
                    parcelaNumero: i,
                    descricao: `[${codNeg}] Parcela ${i}/${qtdParcelas} - ${negociacao.tipo}`,
                });

                // Lançamento da Despesa/Repasse (Empresa -> Proprietário)
                if (proprietarioId) {
                    const taxaAdm = 0.10;
                    const valorRepasse = Number(valorParcela) * (1 - taxaAdm);

                    lancamentos.push({
                        empresa: empresaId,
                        negociacao: negociacaoId,
                        negociacaoCodigo: codNeg,
                        imovel: imovelId,
                        cliente: proprietarioId,
                        tipo: TipoLancamento.DESPESA,
                        categoria: CategoriaLancamento.REPASSE,
                        valor: Number(valorRepasse.toFixed(2)),
                        dataVencimento: new Date(dataVencimento),
                        status: 'PENDENTE',
                        parcelaNumero: i,
                        descricao: `[${codNeg}] Repasse Parcela ${i}/${qtdParcelas}`,
                    });
                }
            }

            if (lancamentos.length === 0) return [];

            return await this.financeiroModel.insertMany(lancamentos);

        } catch (error) {
            console.error('Erro detalhado ao gerar financeiro:', error);
            throw new BadRequestException('Não foi possível gerar os lançamentos financeiros. Verifique os dados e tente novamente.');
        }
    }

    async registrarPagamento(id: string, empresaId: string, dadosBaixa?: { valorPago?: number; observacoes?: string; dataPagamento?: Date }) {
        const updateData: any = {
            status: 'PAGO',
            dataPagamento: dadosBaixa?.dataPagamento || new Date(),
            valorPago: dadosBaixa?.valorPago,
            observacoes: dadosBaixa?.observacoes
        };

        return this.financeiroModel.findOneAndUpdate(
            {
                _id: new Types.ObjectId(id),
                empresa: new Types.ObjectId(empresaId)
            },
            { $set: updateData },
            { new: true }
        ).exec();
    }

    async findAllByEmpresa(empresaId: string, filtros: FinanceiroFiltrosDto) {
        const { page = 1, limit = 10, search, status, tipo, dataInicio, dataFim } = filtros;
        const skip = (page - 1) * limit;

        const query: any = { empresa: new Types.ObjectId(empresaId) };

        if (status) query.status = status;
        if (tipo) query.tipo = tipo;

        if (dataInicio || dataFim) {
            query.dataVencimento = {};
            if (dataInicio) query.dataVencimento.$gte = new Date(dataInicio);
            if (dataFim) query.dataVencimento.$lte = new Date(dataFim);
        }

        if (search) {
            const searchRegex = new RegExp(search, 'i');
            query.$or = [
                { descricao: searchRegex },
                { negociacaoCodigo: searchRegex },
            ];
        }

        const [data, total] = await Promise.all([
            this.financeiroModel
                .find(query)
                .populate('cliente', 'nome')
                .populate('imovel', 'codigo endereco')
                .sort({ dataVencimento: 1 })
                .skip(skip)
                .limit(limit)
                .lean()
                .exec(),
            this.financeiroModel.countDocuments(query).exec(),
        ]);

        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async getResumoMensal(empresaId: string) {
        const hoje = new Date();

        // 1. Busca TOTAIS GERAIS (Cards) - Sem limite de mês
        // Filtramos apenas por Empresa e ignoramos Cancelados
        const totaisGerais = await this.financeiroModel.aggregate([
            {
                $match: {
                    empresa: new Types.ObjectId(empresaId),
                    status: { $ne: 'CANCELADO' }
                }
            },
            {
                $group: {
                    _id: null,
                    receitas: {
                        $sum: {
                            $cond: [
                                { $eq: ["$tipo", TipoLancamento.RECEITA] },
                                { $ifNull: ["$valorPago", "$valor"] },
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
                    pendentes: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $eq: ["$status", "PENDENTE"] },
                                        { $eq: ["$tipo", TipoLancamento.RECEITA] }
                                    ]
                                },
                                "$valor",
                                0
                            ]
                        }
                    }
                }
            }
        ]);

        const resumoCards = totaisGerais[0] || { receitas: 0, despesas: 0, pendentes: 0 };

        // 2. Busca dados para o GRÁFICO (Últimos 6 meses + Próximos 6 meses para cobrir futuro)
        // Aumentamos o range para o gráfico não ficar vazio se houver apenas parcelas futuras
        const dozeMesesAtras = new Date();
        dozeMesesAtras.setMonth(hoje.getMonth() - 6);
        dozeMesesAtras.setDate(1);

        const dadosGraficoRaw = await this.financeiroModel.aggregate([
            {
                $match: {
                    empresa: new Types.ObjectId(empresaId),
                    dataVencimento: { $gte: dozeMesesAtras },
                    status: { $ne: 'CANCELADO' }
                }
            },
            {
                $group: {
                    _id: {
                        mes: { $month: "$dataVencimento" },
                        ano: { $year: "$dataVencimento" },
                        tipo: "$tipo"
                    },
                    total: { $sum: "$valor" },
                    pago: {
                        $sum: { $cond: [{ $eq: ["$status", "PAGO"] }, "$valor", 0] }
                    }
                }
            },
            { $sort: { "_id.ano": 1, "_id.mes": 1 } }
        ]);

        // 3. Formatação para o Frontend
        const mesesNomes = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
        const chartMap = new Map();

        // Gerar labels para os últimos 3 meses e próximos 3 meses (6 meses total) para manter o gráfico dinâmico
        for (let i = -3; i <= 2; i++) {
            const d = new Date();
            d.setMonth(hoje.getMonth() + i);
            const m = d.getMonth() + 1;
            const a = d.getFullYear();
            chartMap.set(`${m}-${a}`, {
                mes: mesesNomes[m - 1],
                recebido: 0,
                pago: 0,
                pendente: 0
            });
        }

        // Preenche com os dados reais
        dadosGraficoRaw.forEach(item => {
            const chave = `${item._id.mes}-${item._id.ano}`;
            if (chartMap.has(chave)) {
                const mesData = chartMap.get(chave);
                if (item._id.tipo === TipoLancamento.RECEITA) {
                    mesData.recebido += item.pago;
                    mesData.pendente += (item.total - item.pago);
                } else {
                    mesData.pago += item.total;
                }
            }
        });

        return {
            receitas: resumoCards.receitas,
            despesas: resumoCards.despesas,
            pendentes: resumoCards.pendentes,
            chartData: Array.from(chartMap.values())
        };
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
                status: 'PENDENTE'
            },
            { $set: { status: 'CANCELADO' } }
        );
    }

}