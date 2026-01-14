// src/financeiro/financeiro.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
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
            empresa: empresaId,
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
            valorParcela: number; // Este valor já vem calculado/editado do modal
            diaVencimento?: number;
        }
    ) {
        const lancamentos: any[] = [];
        const { valorEntrada, qtdParcelas, valorParcela, diaVencimento } = financeiroData;

        const clienteId = negociacao.cliente._id || negociacao.cliente;
        const proprietarioId = imovel.proprietario._id || imovel.proprietario;
        const diaPadrao = diaVencimento || negociacao.dia_vencimento_aluguel || 10;

        // 1. Lançamento da Entrada
        if (valorEntrada > 0) {
            lancamentos.push({
                empresa: negociacao.empresa,
                negociacao: negociacao._id,
                imovel: imovel._id,
                cliente: clienteId,
                tipo: TipoLancamento.RECEITA,
                categoria: negociacao.tipo === 'VENDA' ? CategoriaLancamento.VENDA : CategoriaLancamento.ALUGUEL,
                valor: Number(valorEntrada),
                valorPago: Number(valorEntrada),
                dataVencimento: new Date(),
                dataPagamento: new Date(),
                status: 'PAGO',
                descricao: `Entrada - ${negociacao.tipo} - Imóvel ${imovel.codigo || imovel._id}`,
                observacoes: 'Gerado automaticamente no fechamento.'
            });
        }

        // 2. Geração das Parcelas
        for (let i = 1; i <= qtdParcelas; i++) {
            const vencimento = new Date();
            vencimento.setMonth(vencimento.getMonth() + i);
            vencimento.setDate(diaPadrao);

            // Receita da Imobiliária (Valor que o cliente paga)
            lancamentos.push({
                empresa: negociacao.empresa,
                negociacao: negociacao._id,
                imovel: imovel._id,
                cliente: clienteId,
                tipo: TipoLancamento.RECEITA,
                categoria: negociacao.tipo === 'VENDA' ? CategoriaLancamento.VENDA : CategoriaLancamento.ALUGUEL,
                valor: Number(valorParcela),
                dataVencimento: new Date(vencimento),
                status: 'PENDENTE',
                parcelaNumero: i,
                descricao: `Parcela ${i}/${qtdParcelas} - ${negociacao.tipo}`,
            });

            // Repasse ao Proprietário
            if (proprietarioId) {
                const taxaAdm = 0.10; // 10% - Idealmente viria de imovel.taxa_adm ou empresa.taxa_padrao
                const valorRepasse = valorParcela * (1 - taxaAdm);

                lancamentos.push({
                    empresa: negociacao.empresa,
                    negociacao: negociacao._id,
                    imovel: imovel._id,
                    cliente: proprietarioId,
                    tipo: TipoLancamento.DESPESA,
                    categoria: CategoriaLancamento.REPASSE,
                    valor: Number(valorRepasse.toFixed(2)),
                    dataVencimento: new Date(vencimento),
                    status: 'PENDENTE',
                    parcelaNumero: i,
                    descricao: `Repasse Parcela ${i}/${qtdParcelas} - Ref: ${negociacao.cliente.nome || 'Negociação'}`,
                });
            }
        }

        return await this.financeiroModel.insertMany(lancamentos);
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
                _id: id,
                empresa: { $in: [new Types.ObjectId(empresaId), String(empresaId)] }
            },
            { $set: updateData },
            { new: true }
        ).exec();
    }

    async findAllByEmpresa(empresaId: string, filtros: FinanceiroFiltrosDto) {
        const query: any = { empresa: new Types.ObjectId(empresaId) };

        if (filtros.status) query.status = filtros.status;
        if (filtros.tipo) query.tipo = filtros.tipo;
        if (filtros.dataInicio || filtros.dataFim) {
            query.dataVencimento = {};
            if (filtros.dataInicio) query.dataVencimento.$gte = new Date(filtros.dataInicio);
            if (filtros.dataFim) query.dataVencimento.$lte = new Date(filtros.dataFim);
        }

        return await this.financeiroModel
            .find(query)
            .populate('cliente', 'nome')
            .sort({ dataVencimento: 1 })
            .lean()
            .exec();
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
            .findOne({ _id: id, empresa: new Types.ObjectId(empresaId) })
            .populate('cliente', 'nome')
            .exec();

        const empresa = await this.empresaModel.findById(empresaId).exec();
        if (!lancamento || !empresa) throw new NotFoundException('Dados insuficientes.');
        return { lancamento, empresa };
    }

    async buscarDadosParaReciboSimples(id: string) {
        const lancamento = await this.financeiroModel.findById(id).populate('cliente', 'nome').exec();
        if (!lancamento) return null;
        const empresa = await this.empresaModel.findById(lancamento.empresa).exec();
        return { lancamento, empresa };
    }

    async cancelarParcelasPendentes(negociacaoId: string, empresaId: string) {
        // Cancela apenas o que não foi pago. O que já foi pago fica no histórico financeiro.
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