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
            valorParcela: number;
            diaVencimento?: number;
        }
    ) {
        const lancamentos: any[] = [];
        const { valorEntrada, qtdParcelas, valorParcela, diaVencimento } = financeiroData;

        const clienteId = negociacao.cliente._id || negociacao.cliente;
        const proprietarioId = imovel.proprietario?._id || imovel.proprietario;
        const diaPadrao = diaVencimento || 10;

        const codNeg = negociacao.codigo || 'S/COD';

        if (valorEntrada > 0) {
            lancamentos.push({
                empresa: negociacao.empresa,
                negociacao: negociacao._id,
                negociacaoCodigo: codNeg,
                imovel: imovel._id,
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

        for (let i = 1; i <= qtdParcelas; i++) {
            const vencimento = new Date();
            vencimento.setMonth(vencimento.getMonth() + i);
            vencimento.setDate(diaPadrao);

            lancamentos.push({
                empresa: negociacao.empresa,
                negociacao: negociacao._id,
                negociacaoCodigo: codNeg,
                imovel: imovel._id,
                cliente: clienteId,
                tipo: TipoLancamento.RECEITA,
                categoria: negociacao.tipo === 'VENDA' ? CategoriaLancamento.VENDA : CategoriaLancamento.ALUGUEL,
                valor: Number(valorParcela),
                dataVencimento: new Date(vencimento),
                status: 'PENDENTE',
                parcelaNumero: i,
                descricao: `[${codNeg}] Parcela ${i}/${qtdParcelas} - ${negociacao.tipo}`,
            });

            if (proprietarioId) {
                const taxaAdm = 0.10;
                const valorRepasse = valorParcela * (1 - taxaAdm);

                lancamentos.push({
                    empresa: negociacao.empresa,
                    negociacao: negociacao._id,
                    negociacaoCodigo: codNeg,
                    imovel: imovel._id,
                    cliente: proprietarioId,
                    tipo: TipoLancamento.DESPESA,
                    categoria: CategoriaLancamento.REPASSE,
                    valor: Number(valorRepasse.toFixed(2)),
                    dataVencimento: new Date(vencimento),
                    status: 'PENDENTE',
                    parcelaNumero: i,
                    descricao: `[${codNeg}] Repasse Parcela ${i}/${qtdParcelas}`,
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

    /**
     * MÉTODO CORRIGIDO: Agora aceita o parâmetro 'search' e filtra corretamente
     */
    async findAllByEmpresa(empresaId: string, filtros: FinanceiroFiltrosDto) {
        const query: any = { empresa: new Types.ObjectId(empresaId) };

        // Filtro de Status
        if (filtros.status) query.status = filtros.status;

        // Filtro de Tipo (Receita/Despesa)
        if (filtros.tipo) query.tipo = filtros.tipo;

        // Filtro de Período de Vencimento
        if (filtros.dataInicio || filtros.dataFim) {
            query.dataVencimento = {};
            if (filtros.dataInicio) query.dataVencimento.$gte = new Date(filtros.dataInicio);
            if (filtros.dataFim) query.dataVencimento.$lte = new Date(filtros.dataFim);
        }

        // CORREÇÃO: Lógica de Busca Global (Search)
        if (filtros.search) {
            const searchRegex = new RegExp(filtros.search, 'i'); // 'i' para ignorar maiúsculas/minúsculas
            query.$or = [
                { descricao: searchRegex },
                { negociacaoCodigo: searchRegex },
                // Se quiser buscar por campos de texto de IDs populados, 
                // o ideal é fazer via Aggregate ou filtrar o search após o populate.
                // Aqui filtramos campos diretos do schema Financeiro.
            ];
        }

        return await this.financeiroModel
            .find(query)
            .populate('cliente', 'nome')
            .populate('imovel', 'codigo endereco') // Adicionado para facilitar visualização na lista
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