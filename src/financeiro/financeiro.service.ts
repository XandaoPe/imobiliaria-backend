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
        @InjectModel(Empresa.name) private empresaModel: Model<EmpresaDocument>, // ⭐️ Adicione esta linha
    ) { }

    async create(createDto: CreateFinanceiroDto, empresaId: string) {
        const novoLancamento = new this.financeiroModel({
            ...createDto,
            empresa: empresaId, // ⭐️ Mude de 'empresaId' para 'empresa' para bater com o Schema
        });

        return await novoLancamento.save();
    }

    async gerarFluxoAluguel(negociacao: any, imovel: ImovelDocument) {
        // ⭐️ Tipando o array explicitamente para evitar o erro de 'never'
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

    // src/financeiro/financeiro.service.ts

    async findAllByEmpresa(empresaId: string, filtros: FinanceiroFiltrosDto) {
        console.log("🔍 Buscando financeira para empresa ID:", empresaId);

        if (!empresaId) return [];

        // ⭐️ A CONSULTA: Tentamos converter para ObjectId de forma segura
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

        // Lógica de datas...
        if (filtros.dataInicio || filtros.dataFim) {
            query.dataVencimento = {};
            if (filtros.dataInicio) query.dataVencimento.$gte = new Date(filtros.dataInicio);
            if (filtros.dataFim) query.dataVencimento.$lte = new Date(filtros.dataFim);
        }

        const resultados = await this.financeiroModel
            .find(query)
            .sort({ dataVencimento: 1 })
            .lean() // ⭐️ .lean() melhora a performance e ajuda na leitura pura
            .exec();

        console.log("✅ Total de registros encontrados no banco:", resultados.length);
        return resultados;
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
        const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0); // ⭐️ Corrigido 'hoy' para 'hoje'

        const lancamentos = await this.financeiroModel.find({
            empresa: {
                $in: [new Types.ObjectId(empresaId), String(empresaId)]
            },
            dataVencimento: { $gte: primeiroDiaMes, $lte: ultimoDiaMes }
        }).exec();

        console.log(`DEBUG Dashboard: Encontrados ${lancamentos.length} lançamentos para o resumo.`);

        return {
            receitas: lancamentos.filter(l => l.tipo === TipoLancamento.RECEITA).reduce((acc, l) => acc + l.valor, 0),
            despesas: lancamentos.filter(l => l.tipo === TipoLancamento.DESPESA).reduce((acc, l) => acc + l.valor, 0),
            pendentes: lancamentos.filter(l => l.status === 'PENDENTE').length,
        };
    }

    async buscarDadosParaRecibo(id: string, empresaId: string) {
        const lancamento = await this.financeiroModel
            .findOne({
                _id: id,
                // ⭐️ Flexibilidade de tipo aqui também
                empresa: { $in: [new Types.ObjectId(empresaId), String(empresaId)] }
            })
            .populate('cliente', 'nome')
            .exec();

        // Para a empresa, o findById costuma aceitar string direto, 
        // mas se falhar, use: .findOne({ _id: { $in: [new Types.ObjectId(empresaId), String(empresaId)] } })
        const empresa = await this.empresaModel.findById(empresaId).exec();

        if (!lancamento || !empresa) {
            throw new NotFoundException('Dados insuficientes para gerar o recibo.');
        }

        return { lancamento, empresa };
    }
}