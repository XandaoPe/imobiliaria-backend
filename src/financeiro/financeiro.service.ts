// src/financeiro/financeiro.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Financeiro, FinanceiroDocument, TipoLancamento, CategoriaLancamento } from './schemas/financeiro.schema';
import { ImovelDocument } from 'src/imovel/schemas/imovel.schema';
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

    async gerarFluxoAluguel(negociacao: any, imovel: ImovelDocument) {
        const parcelas: any[] = [];
        const meses = 12;

        for (let i = 0; i < meses; i++) {
            const vencimento = new Date(negociacao.data_inicio_contrato);
            vencimento.setMonth(vencimento.getMonth() + i);
            vencimento.setDate(negociacao.dia_vencimento_aluguel || 10);

            // 1. Receita do Inquilino
            parcelas.push({
                empresa: negociacao.empresa,
                imovel: imovel._id,
                cliente: negociacao.cliente,
                tipo: TipoLancamento.RECEITA,
                categoria: CategoriaLancamento.ALUGUEL,
                valor: negociacao.valor_acordado,
                dataVencimento: vencimento,
                status: 'PENDENTE',
                parcelaNumero: i + 1,
                descricao: `Aluguel ${i + 1}/${meses}`,
            });

            // 2. Repasse ao Proprietário
            parcelas.push({
                empresa: negociacao.empresa,
                imovel: imovel._id,
                cliente: imovel.proprietario,
                tipo: TipoLancamento.DESPESA,
                categoria: CategoriaLancamento.REPASSE,
                valor: negociacao.valor_acordado * 0.9,
                dataVencimento: vencimento,
                status: 'PENDENTE',
                parcelaNumero: i + 1,
                descricao: `Repasse Aluguel ${i + 1}/${meses}`,
            });
        }
        return this.financeiroModel.insertMany(parcelas);
    }

    async findAllByEmpresa(empresaId: string, filtros: FinanceiroFiltrosDto) {
        if (!empresaId) return [];

        const query: any = {
            empresa: {
                $in: [
                    new Types.ObjectId(empresaId),
                    String(empresaId)
                ]
            }
        };

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

    async registrarPagamento(id: string, empresaId: string) {
        return this.financeiroModel.findOneAndUpdate(
            {
                _id: id,
                empresa: { $in: [new Types.ObjectId(empresaId), String(empresaId)] }
            },
            { status: 'PAGO', dataPagamento: new Date() },
            { new: true }
        ).exec();
    }

    async getResumoMensal(empresaId: string) {
        const hoje = new Date();
        const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

        const lancamentos = await this.financeiroModel.find({
            empresa: {
                $in: [new Types.ObjectId(empresaId), String(empresaId)]
            },
            dataVencimento: { $gte: primeiroDiaMes, $lte: ultimoDiaMes }
        }).exec();

        return {
            receitas: lancamentos.filter(l => l.tipo === TipoLancamento.RECEITA).reduce((acc, l) => acc + l.valor, 0),
            despesas: lancamentos.filter(l => l.tipo === TipoLancamento.DESPESA).reduce((acc, l) => acc + l.valor, 0),
            pendentes: lancamentos.filter(l => l.status === 'PENDENTE').length,
        };
    }

    /**
     * Busca dados para o recibo validando a empresa (Uso interno/logado)
     */
    async buscarDadosParaRecibo(id: string, empresaId: string) {
        const lancamento = await this.financeiroModel
            .findOne({
                _id: id,
                empresa: { $in: [new Types.ObjectId(empresaId), String(empresaId)] }
            })
            .populate('cliente', 'nome')
            .exec();

        const empresa = await this.empresaModel.findById(empresaId).exec();

        if (!lancamento || !empresa) {
            throw new NotFoundException('Dados insuficientes para gerar o recibo.');
        }

        return { lancamento, empresa };
    }

    /**
     * Busca dados para validação pública via QR Code (Não exige empresaId do solicitante)
     */
    async buscarDadosParaReciboSimples(id: string) {
        const lancamento = await this.financeiroModel
            .findById(id)
            .populate('cliente', 'nome')
            .exec();

        if (!lancamento) return null;

        const empresa = await this.empresaModel.findById(lancamento.empresa).exec();

        return { lancamento, empresa };
    }
}