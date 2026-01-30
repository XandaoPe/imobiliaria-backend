import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Comissao, ComissaoDocument } from './schemas/comissao.schema';
import { CargoRegra, ComissaoRegra, ComissaoRegraDocument } from './schemas/comissaoRegra.schema';
import { NivelUsuario, PerfisEnum, Usuario, UsuarioDocument } from '../usuario/schemas/usuario.schema';
import { Financeiro, FinanceiroDocument } from '../financeiro/schemas/financeiro.schema';
import { DistribuirComissaoDto } from './dto/distribuir-comissao.dto';
import { PagarComissaoDto } from './dto/pagar-comissao.dto';
import { FiltrarComissaoDto } from './dto/filtrar-comissao.dto';

@Injectable()
export class ComissaoService {
    constructor(
        @InjectModel(Comissao.name) private comissaoModel: Model<ComissaoDocument>,
        @InjectModel(ComissaoRegra.name) private regraModel: Model<ComissaoRegraDocument>,
        @InjectModel(Usuario.name) private usuarioModel: Model<UsuarioDocument>,
        @InjectModel(Financeiro.name) private financeiroModel: Model<FinanceiroDocument>,
    ) { }

    /**
     * Distribui comissões para um lançamento financeiro
     */
    async distribuirComissoes(financeiroId: string, dto: DistribuirComissaoDto, usuarioDistribuidorId: string): Promise<any> {
        // Validar financeiro
        const financeiro = await this.financeiroModel.findById(financeiroId);
        if (!financeiro) {
            throw new NotFoundException('Lançamento financeiro não encontrado');
        }

        // Verificar se já foi distribuído
        if (financeiro.comissoesDistribuidas && !dto.forcarRedistribuicao) {
            throw new BadRequestException('Comissões já foram distribuídas para este lançamento');
        }

        // Verificar tipo de negócio (só RECEITA tem comissão)
        if (financeiro.tipo !== 'RECEITA') {
            throw new BadRequestException('Apenas lançamentos do tipo RECEITA podem ter comissões');
        }

        // Determinar tipo de negócio baseado na categoria
        const tipoNegocio = this.obterTipoNegocioDaCategoria(financeiro.categoria);

        let comissoesDistribuidas: ComissaoDocument[] = [];

        if (dto.metodo === 'AUTO') {
            // Distribuição automática baseada nas regras
            comissoesDistribuidas = await this.distribuirAutomaticamente(
                financeiro,
                tipoNegocio,
                usuarioDistribuidorId
            );
        } else if (dto.metodo === 'MANUAL' && dto.usuarios) {
            // Distribuição manual
            comissoesDistribuidas = await this.distribuirManualmente(
                financeiro,
                dto.usuarios,
                tipoNegocio,
                usuarioDistribuidorId
            );
        } else {
            throw new BadRequestException('Método de distribuição inválido');
        }

        // Calcular total das comissões
        const totalComissoes = comissoesDistribuidas.reduce((sum, c) => sum + c.valorComissao, 0);

        // Atualizar financeiro
        await this.financeiroModel.findByIdAndUpdate(financeiroId, {
            comissoesDistribuidas: true,
            distribuicaoComissao: {
                dataDistribuicao: new Date().toISOString().split('T')[0],
                distribuidoPor: new Types.ObjectId(usuarioDistribuidorId),
                metodoCalculo: dto.metodo,
                totalComissoes,
                observacao: dto.observacao,
            }
        });

        // Atualizar comissões acumuladas dos usuários
        await this.atualizarComissoesAcumuladas(comissoesDistribuidas);

        return {
            financeiroId,
            totalComissoes: comissoesDistribuidas.length,
            valorTotalComissoes: totalComissoes,
            comissoes: comissoesDistribuidas,
        };
    }

    /**
     * Distribuição automática baseada nas regras
     */
    private async distribuirAutomaticamente(
        financeiro: FinanceiroDocument,
        tipoNegocio: 'VENDA' | 'ALUGUEL',
        usuarioDistribuidorId: string
    ): Promise<ComissaoDocument[]> {
        // Buscar regras aplicáveis com query corrigida
        const query = {
            ativo: true,
            $and: [
                {
                    $or: [
                        { tipoNegocio: 'AMBOS' },
                        { tipoNegocio: tipoNegocio }
                    ]
                },
                {
                    $or: [
                        { dataInicio: { $lte: new Date() } },
                        { dataInicio: { $exists: false } }
                    ]
                },
                {
                    $or: [
                        { dataFim: { $gte: new Date() } },
                        { dataFim: { $exists: false } }
                    ]
                }
            ]
        };

        const regras = await this.regraModel.find(query)
            .sort({ prioridade: -1 })
            .exec();

        // Buscar usuários que podem receber comissão
        const usuarios = await this.usuarioModel.find({
            empresa: financeiro.empresa,
            ativoFinanceiro: true,
            ativo: true,
        }).exec();

        const comissoes: ComissaoDocument[] = [];
        const valorBase = this.calcularValorBaseComissao(financeiro.valor, tipoNegocio);

        // Para cada usuário, aplicar regras
        for (const usuario of usuarios) {
            const regraAplicavel = this.encontrarRegraAplicavel(regras, usuario, tipoNegocio);

            if (regraAplicavel) {
                const valorComissao = this.calcularValorComissao(
                    valorBase,
                    regraAplicavel.percentual,
                    regraAplicavel.valorFixo || 0,
                    regraAplicavel.tipoCalculo
                );

                if (valorComissao > 0) {
                    // Obter nível do usuário (se existir)
                    const usuarioNivel = (usuario as any).nivel || 'JUNIOR';

                    const comissao = new this.comissaoModel({
                        financeiroId: financeiro._id,
                        usuarioId: usuario._id,
                        regraId: regraAplicavel._id,
                        tipoNegocio,
                        valorTotal: financeiro.valor,
                        valorBaseCalculo: valorBase,
                        percentualAplicado: regraAplicavel.percentual,
                        valorComissao,
                        valorFixoAdicional: regraAplicavel.valorFixo || 0,
                        status: 'PENDENTE',
                        usuarioNome: usuario.nome,
                        usuarioCargo: usuario.perfil,
                        usuarioNivel,
                        distribuidoPor: new Types.ObjectId(usuarioDistribuidorId),
                    });

                    const savedComissao = await comissao.save();
                    comissoes.push(savedComissao);
                }
            }
        }

        return comissoes;
    }

    /**
     * Distribuição manual
     */
    private async distribuirManualmente(
        financeiro: FinanceiroDocument,
        usuariosDto: any[],
        tipoNegocio: 'VENDA' | 'ALUGUEL',
        usuarioDistribuidorId: string
    ): Promise<ComissaoDocument[]> {
        const comissoes: ComissaoDocument[] = [];
        const valorBase = this.calcularValorBaseComissao(financeiro.valor, tipoNegocio);

        for (const usuarioDto of usuariosDto) {
            const usuario = await this.usuarioModel.findById(usuarioDto.usuarioId);
            if (!usuario || !(usuario as any).ativoFinanceiro) {
                continue;
            }

            const valorComissao = this.calcularValorComissao(
                valorBase,
                usuarioDto.percentual || 0,
                usuarioDto.valorFixo || 0,
                'MISTO'
            );

            if (valorComissao > 0) {
                const usuarioNivel = (usuario as any).nivel || 'JUNIOR';

                const comissao = new this.comissaoModel({
                    financeiroId: financeiro._id,
                    usuarioId: usuario._id,
                    tipoNegocio,
                    valorTotal: financeiro.valor,
                    valorBaseCalculo: valorBase,
                    percentualAplicado: usuarioDto.percentual || 0,
                    valorComissao,
                    valorFixoAdicional: usuarioDto.valorFixo || 0,
                    status: 'PENDENTE',
                    usuarioNome: usuario.nome,
                    usuarioCargo: usuario.perfil,
                    usuarioNivel,
                    distribuidoPor: new Types.ObjectId(usuarioDistribuidorId),
                    observacao: usuarioDto.observacao,
                });

                const savedComissao = await comissao.save();
                comissoes.push(savedComissao);
            }
        }

        return comissoes;
    }

    /**
     * Pagar comissões
     */
    async pagarComissoes(dto: PagarComissaoDto, usuarioPagadorId: string): Promise<any> {
        const comissoes = await this.comissaoModel.find({
            _id: { $in: dto.comissaoIds.map(id => new Types.ObjectId(id)) },
            status: { $in: ['PENDENTE', 'APROVADA'] }
        });

        if (comissoes.length === 0) {
            throw new NotFoundException('Nenhuma comissão válida encontrada para pagamento');
        }

        const dataPagamento = dto.dataPagamento || new Date().toISOString().split('T')[0];
        const updates = comissoes.map(comissao => ({
            updateOne: {
                filter: { _id: comissao._id },
                update: {
                    $set: {
                        status: 'PAGA',
                        dataPagamento: new Date(dataPagamento),
                        formaPagamento: dto.formaPagamento || 'TRANSFERENCIA',
                        pagoPor: new Types.ObjectId(usuarioPagadorId),
                        observacao: dto.observacao,
                    }
                }
            }
        }));

        await this.comissaoModel.bulkWrite(updates);

        // Atualizar comissões acumuladas dos usuários (subtrair o pago)
        await this.atualizarComissoesAcumuladasAposPagamento(comissoes);

        return {
            comissoesPagas: comissoes.length,
            valorTotalPago: comissoes.reduce((sum, c) => sum + c.valorComissao, 0),
            dataPagamento,
        };
    }

    /**
     * Listar comissões com filtros
     */
    async listarComissoes(empresaId: string, filtros: FiltrarComissaoDto): Promise<any> {
        const query: any = {};

        // Filtro por empresa (via financeiro)
        const financeirosIds = await this.financeiroModel.find({ empresa: empresaId }).distinct('_id');
        query['financeiroId'] = { $in: financeirosIds };

        if (filtros.usuarioId) {
            query.usuarioId = new Types.ObjectId(filtros.usuarioId);
        }

        if (filtros.financeiroId) {
            query.financeiroId = new Types.ObjectId(filtros.financeiroId);
        }

        if (filtros.status) {
            query.status = filtros.status;
        }

        if (filtros.tipoNegocio) {
            query.tipoNegocio = filtros.tipoNegocio;
        }

        if (filtros.dataInicio || filtros.dataFim) {
            query.createdAt = {};
            if (filtros.dataInicio) {
                query.createdAt.$gte = new Date(filtros.dataInicio + 'T00:00:00.000Z');
            }
            if (filtros.dataFim) {
                query.createdAt.$lte = new Date(filtros.dataFim + 'T23:59:59.999Z');
            }
        }

        const pagina = filtros.pagina || 1;
        const limite = filtros.limite || 20;
        const skip = (pagina - 1) * limite;

        const [comissoes, total] = await Promise.all([
            this.comissaoModel.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limite)
                .populate('usuarioId', 'nome email perfil')
                .populate('financeiroId', 'descricao valor dataVencimento categoria')
                .populate('regraId', 'nome percentual')
                .exec(),
            this.comissaoModel.countDocuments(query)
        ]);

        return {
            comissoes,
            paginacao: {
                total,
                pagina,
                limite,
                totalPaginas: Math.ceil(total / limite),
            }
        };
    }

    /**
     * Buscar comissões de um usuário específico
     */
    async comissoesPorUsuario(usuarioId: string, empresaId: string): Promise<any> {
        // Verificar se o usuário pertence à empresa
        const usuario = await this.usuarioModel.findOne({
            _id: usuarioId,
            empresa: empresaId
        });

        if (!usuario) {
            throw new ForbiddenException('Usuário não encontrado ou não pertence à empresa');
        }

        const comissoes = await this.comissaoModel.find({ usuarioId })
            .sort({ createdAt: -1 })
            .populate('financeiroId', 'descricao valor dataVencimento categoria tipo')
            .populate('regraId', 'nome percentual')
            .exec();

        const totalPendente = comissoes
            .filter(c => c.status === 'PENDENTE' || c.status === 'APROVADA')
            .reduce((sum, c) => sum + c.valorComissao, 0);

        const totalPago = comissoes
            .filter(c => c.status === 'PAGA')
            .reduce((sum, c) => sum + c.valorComissao, 0);

        // Obter comissão acumulada do usuário
        const usuarioComissaoAcumulada = (usuario as any).comissaoAcumulada || 0;

        return {
            usuario: {
                nome: usuario.nome,
                perfil: usuario.perfil,
                comissaoAcumulada: usuarioComissaoAcumulada,
            },
            resumo: {
                totalComissoes: comissoes.length,
                totalPendente,
                totalPago,
            },
            comissoes,
        };
    }

    /**
     * Aprovar comissões (antes do pagamento)
     */
    async aprovarComissoes(comissaoIds: string[], usuarioAprovadorId: string): Promise<any> {
        const result = await this.comissaoModel.updateMany(
            {
                _id: { $in: comissaoIds.map(id => new Types.ObjectId(id)) },
                status: 'PENDENTE'
            },
            {
                $set: {
                    status: 'APROVADA',
                    observacao: `Aprovado por usuário ${usuarioAprovadorId} em ${new Date().toISOString()}`
                }
            }
        );

        return {
            aprovadas: result.modifiedCount,
            mensagem: `${result.modifiedCount} comissões aprovadas com sucesso`
        };
    }

    /**
     * Cancelar comissões
     */
    async cancelarComissoes(comissaoIds: string[], motivo: string, usuarioCanceladorId: string): Promise<any> {
        const result = await this.comissaoModel.updateMany(
            {
                _id: { $in: comissaoIds.map(id => new Types.ObjectId(id)) },
                status: { $in: ['PENDENTE', 'APROVADA'] }
            },
            {
                $set: {
                    status: 'CANCELADA',
                    motivoCancelamento: motivo,
                    observacao: `Cancelado por usuário ${usuarioCanceladorId} em ${new Date().toISOString()}`
                }
            }
        );

        // Atualizar comissões acumuladas (remover as canceladas)
        await this.atualizarComissoesAcumuladasAposCancelamento(comissaoIds);

        return {
            canceladas: result.modifiedCount,
            mensagem: `${result.modifiedCount} comissões canceladas`
        };
    }

    /**
     * Métodos auxiliares privados
     */
    private obterTipoNegocioDaCategoria(categoria: string): 'VENDA' | 'ALUGUEL' {
        if (categoria.includes('VENDA')) return 'VENDA';
        if (categoria.includes('ALUGUEL')) return 'ALUGUEL';
        return 'ALUGUEL'; // Default
    }

    private calcularValorBaseComissao(valorTotal: number, tipoNegocio: 'VENDA' | 'ALUGUEL'): number {
        // Lógica para calcular o valor base
        // Ex: Para aluguel, pode ser apenas o primeiro mês
        // Para venda, pode ser o valor total
        // Você pode ajustar esta lógica conforme necessário
        if (tipoNegocio === 'ALUGUEL') {
            // Para aluguéis, a comissão é normalmente sobre o primeiro aluguel
            return valorTotal; // Ajuste se necessário
        }
        return valorTotal; // Para vendas, sobre o valor total
    }

    private calcularValorComissao(
        valorBase: number,
        percentual: number,
        valorFixo: number,
        tipoCalculo: string
    ): number {
        switch (tipoCalculo) {
            case 'PERCENTUAL':
                return (valorBase * percentual) / 100;
            case 'FIXO':
                return valorFixo;
            case 'MISTO':
                return ((valorBase * percentual) / 100) + (valorFixo || 0);
            default:
                return 0;
        }
    }

    private encontrarRegraAplicavel(
        regras: ComissaoRegraDocument[],
        usuario: UsuarioDocument,
        tipoNegocio: string
    ): ComissaoRegraDocument | null {
        // Mapeamento entre PerfisEnum e CargoRegra
        const mapeamentoCargo: Record<PerfisEnum, CargoRegra> = {
            [PerfisEnum.CORRETOR]: CargoRegra.CORRETOR,
            [PerfisEnum.GERENTE]: CargoRegra.GERENTE,
            [PerfisEnum.ADM_GERAL]: CargoRegra.ADM_GERAL,
            [PerfisEnum.SUPORTE]: CargoRegra.OUTRO,
        };

        // Ordenar por prioridade (maior primeiro)
        const regrasOrdenadas = [...regras].sort((a, b) => b.prioridade - a.prioridade);

        for (const regra of regrasOrdenadas) {
            // Verificar se aplica ao tipo de negócio
            if (regra.tipoNegocio !== 'AMBOS' && regra.tipoNegocio !== tipoNegocio) {
                continue;
            }

            // Verificar se aplica ao cargo
            if (regra.cargo && regra.cargo.length > 0) {
                const cargoUsuario = mapeamentoCargo[usuario.perfil];
                if (!regra.cargo.includes(cargoUsuario)) {
                    continue;
                }
            }

            // Verificar se aplica ao nível
            if (regra.nivel && regra.nivel.length > 0) {
                const usuarioNivel = (usuario as any).nivel || NivelUsuario.JUNIOR;
                if (!regra.nivel.includes(usuarioNivel)) {
                    continue;
                }
            }

            return regra;
        }

        return null;
    }

    private async atualizarComissoesAcumuladas(comissoes: ComissaoDocument[]): Promise<void> {
        for (const comissao of comissoes) {
            await this.usuarioModel.findByIdAndUpdate(
                comissao.usuarioId,
                { $inc: { comissaoAcumulada: comissao.valorComissao } }
            );
        }
    }

    private async atualizarComissoesAcumuladasAposPagamento(comissoes: ComissaoDocument[]): Promise<void> {
        for (const comissao of comissoes) {
            await this.usuarioModel.findByIdAndUpdate(
                comissao.usuarioId,
                { $inc: { comissaoAcumulada: -comissao.valorComissao } }
            );
        }
    }

    private async atualizarComissoesAcumuladasAposCancelamento(comissaoIds: string[]): Promise<void> {
        const comissoes = await this.comissaoModel.find({
            _id: { $in: comissaoIds.map(id => new Types.ObjectId(id)) }
        });

        for (const comissao of comissoes) {
            await this.usuarioModel.findByIdAndUpdate(
                comissao.usuarioId,
                { $inc: { comissaoAcumulada: -comissao.valorComissao } }
            );
        }
    }

    /**
     * Relatórios e estatísticas
     */
    async relatorioComissoes(empresaId: string, dataInicio: string, dataFim: string): Promise<any> {
        const financeiros = await this.financeiroModel.find({
            empresa: empresaId,
            dataVencimento: { $gte: dataInicio, $lte: dataFim },
            tipo: 'RECEITA'
        }).distinct('_id');

        const comissoes = await this.comissaoModel.find({
            financeiroId: { $in: financeiros }
        }).populate('usuarioId', 'nome perfil');

        // Agrupar por usuário
        const porUsuario: Record<string, any> = {};

        comissoes.forEach(comissao => {
            const usuarioId = comissao.usuarioId.toString();
            if (!porUsuario[usuarioId]) {
                porUsuario[usuarioId] = {
                    usuario: (comissao as any).usuarioId,
                    total: 0,
                    pendente: 0,
                    pago: 0,
                    quantidade: 0
                };
            }

            porUsuario[usuarioId].total += comissao.valorComissao;
            porUsuario[usuarioId].quantidade += 1;

            if (comissao.status === 'PENDENTE' || comissao.status === 'APROVADA') {
                porUsuario[usuarioId].pendente += comissao.valorComissao;
            } else if (comissao.status === 'PAGA') {
                porUsuario[usuarioId].pago += comissao.valorComissao;
            }
        });

        // Totais gerais
        const totais = {
            totalComissoes: comissoes.reduce((sum, c) => sum + c.valorComissao, 0),
            totalPendente: comissoes
                .filter(c => c.status === 'PENDENTE' || c.status === 'APROVADA')
                .reduce((sum, c) => sum + c.valorComissao, 0),
            totalPago: comissoes
                .filter(c => c.status === 'PAGA')
                .reduce((sum, c) => sum + c.valorComissao, 0),
            totalUsuarios: Object.keys(porUsuario).length,
        };

        return {
            periodo: { dataInicio, dataFim },
            totais,
            porUsuario: Object.values(porUsuario),
        };
    }
}