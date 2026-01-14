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
        const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

        const lancamentos = await this.financeiroModel.find({
            empresa: new Types.ObjectId(empresaId),
            dataVencimento: { $gte: primeiroDiaMes, $lte: ultimoDiaMes }
        }).exec();

        return {
            receitas: lancamentos.filter(l => l.tipo === TipoLancamento.RECEITA).reduce((acc, l) => acc + (l.valorPago || l.valor), 0),
            despesas: lancamentos.filter(l => l.tipo === TipoLancamento.DESPESA).reduce((acc, l) => acc + l.valor, 0),
            pendentes: lancamentos.filter(l => l.status === 'PENDENTE').length,
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