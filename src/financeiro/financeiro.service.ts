import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { Financeiro, FinanceiroDocument, TipoLancamento, CategoriaLancamento, StatusFinanceiro } from './schemas/financeiro.schema';
import { FinanceiroFiltrosDto } from './dto/financeiro-filtros.dto';
import { Empresa, EmpresaDocument } from 'src/empresa/schemas/empresa.schema';
import { CreateFinanceiroDto } from './dto/create-financeiro.dto';
import { Cliente } from 'src/cliente/schemas/cliente.schema';
import { ConfiguracaoService } from 'src/configuracao/configuracao.service';

@Injectable()
export class FinanceiroService {
    constructor(
        @InjectModel(Financeiro.name) private financeiroModel: Model<FinanceiroDocument>,
        @InjectModel(Empresa.name) private empresaModel: Model<EmpresaDocument>,
        @InjectModel(Cliente.name) private clienteModel: Model<any>,
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
        const { page = 1, limit = 10, search, status, dataInicio, dataFim } = filtros;
        const skip = (page - 1) * limit;

        const query: FilterQuery<FinanceiroDocument> = {
            empresa: new Types.ObjectId(empresaId),
            status: { $ne: StatusFinanceiro.CANCELADO }
        };

        if (status && status !== 'TODOS') {
            query.status = status;
        }

        if (dataInicio || dataFim) {
            query.dataVencimento = this.criarFiltroDataString(dataInicio, dataFim);
        }

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
                // ALTERAÇÃO AQUI: Deep Populate para pegar o proprietário do imóvel
                .populate({
                    path: 'imovel',
                    select: 'titulo endereco cidade proprietario codigo',
                    populate: {
                        path: 'proprietario',
                        model: 'Cliente', // Certifique-on de que este é o nome do model de clientes
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

    async getResumoMensal(empresaId: string, filtros: FinanceiroFiltrosDto) {
        const { dataInicio, dataFim, search } = filtros;
        const hoje = new Date();

        const matchFiltro: any = {
            empresa: new Types.ObjectId(empresaId),
            status: { $ne: StatusFinanceiro.CANCELADO }
        };

        if (dataInicio || dataFim) {
            matchFiltro.dataVencimento = this.criarFiltroDataString(dataInicio, dataFim);
        }

        if (search) {
            const clientes = await this.clienteModel.find({
                nome: { $regex: search, $options: 'i' },
                empresa: new Types.ObjectId(empresaId)
            }).select('_id').lean();

            matchFiltro.$or = [
                { descricao: { $regex: search, $options: 'i' } },
                { negociacaoCodigo: { $regex: search, $options: 'i' } },
                { cliente: { $in: clientes.map(c => c._id) } }
            ];
        }

        const totaisGerais = await this.financeiroModel.aggregate([
            { $match: matchFiltro },
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
                                        { $eq: ["$status", StatusFinanceiro.PENDENTE] },
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

        let matchGrafico = { ...matchFiltro };
        if (!dataInicio && !dataFim) {
            const seisMesesAtras = new Date();
            seisMesesAtras.setMonth(hoje.getMonth() - 6);
            seisMesesAtras.setDate(1);
            matchGrafico.dataVencimento = { ...matchGrafico.dataVencimento, $gte: seisMesesAtras };
        }

        const dadosGraficoRaw = await this.financeiroModel.aggregate([
            { $match: matchGrafico },
            {
                $group: {
                    _id: {
                        mes: { $month: { $dateFromString: { dateString: "$dataVencimento" } } },
                        ano: { $year: { $dateFromString: { dateString: "$dataVencimento" } } },
                        tipo: "$tipo"
                    },
                    total: { $sum: "$valor" },
                    pago: {
                        $sum: { $cond: [{ $eq: ["$status", StatusFinanceiro.PAGO] }, "$valor", 0] }
                    }
                }
            },
            { $sort: { "_id.ano": 1, "_id.mes": 1, dataVencimento: 1 } }
        ]);

        const mesesNomes = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
        const chartMap = new Map();

        if (!dataInicio || !dataFim) {
            for (let i = -3; i <= 2; i++) {
                const d = new Date();
                d.setMonth(hoje.getMonth() + i);
                const m = d.getMonth() + 1;
                const a = d.getFullYear();
                chartMap.set(`${m}-${a}`, { mes: mesesNomes[m - 1], recebido: 0, pago: 0, pendente: 0 });
            }
        }

        dadosGraficoRaw.forEach(item => {
            const chave = `${item._id.mes}-${item._id.ano}`;
            if (!chartMap.has(chave)) {
                chartMap.set(chave, { mes: mesesNomes[item._id.mes - 1], recebido: 0, pago: 0, pendente: 0 });
            }
            const mesData = chartMap.get(chave);
            if (item._id.tipo === TipoLancamento.RECEITA) {
                mesData.recebido += item.pago;
                mesData.pendente += (item.total - item.pago);
            } else {
                mesData.pago += item.total;
            }
        });

        return {
            receitas: resumoCards.receitas,
            despesas: resumoCards.despesas,
            pendentes: resumoCards.pendentes,
            chartData: Array.from(chartMap.values())
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

            // 3. COMISSÕES (NOVO) - Criadas na data atual
            if (comissoes && comissoes.length > 0) {
                comissoes.forEach((comissao: any) => {
                    lancamentos.push({
                        empresa: empresaId,
                        negociacao: negociacaoId,
                        negociacaoCodigo: codNeg,
                        imovel: imovelId,
                        cliente: new Types.ObjectId(comissao.usuarioId), // ID do USUÁRIO (corretor)
                        tipo: TipoLancamento.DESPESA,
                        categoria: CategoriaLancamento.COMISSAO, // AGORA DEVE EXISTIR
                        valor: Number(comissao.valorCalculado),
                        dataVencimento: dataAtualStr, // Comissão vence na data atual
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