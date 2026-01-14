// src/negociacao/negociacao.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Negociacao, NegociacaoDocument, StatusNegociacao } from './schemas/negociacao.schema';
import { CreateNegociacaoDto } from './dto/create-negociacao.dto';
import { ImovelService } from 'src/imovel/imovel.service';
import { AgendamentoService } from 'src/agendamento/agendamento.service';
import { StatusAgendamento } from 'src/agendamento/schemas/agendamento.schema';
import { FinanceiroService } from 'src/financeiro/financeiro.service';

@Injectable()
export class NegociacaoService {
    constructor(
        @InjectModel(Negociacao.name) private negociacaoModel: Model<NegociacaoDocument>,
        @InjectModel('Counter') private counterModel: Model<any>,
        private imovelService: ImovelService,
        private agendamentoService: AgendamentoService,
        private financeiroService: FinanceiroService,
    ) { }

    private async generateNextCodigo(): Promise<string> {
        const counter = await this.counterModel.findOneAndUpdate(
            { nome: 'negociacao_seq' }, // Alterado de 'id' para 'nome'
            { $inc: { seq: 1 } },
            { new: true, upsert: true }
        );

        const ano = new Date().getFullYear();
        // Formata o número com 4 dígitos (ex: 0001, 0002...)
        const sequencial = counter.seq.toString().padStart(4, '0');
        return `NEG-${ano}-${sequencial}`;
    }

    async findOne(id: string, empresaId: string): Promise<NegociacaoDocument> {
        const negociacao = await this.negociacaoModel
            .findOne({ _id: id, empresa: new Types.ObjectId(empresaId) })
            .populate('cliente', 'nome telefone email endereco cidade')
            .populate('imovel', 'titulo endereco cidade proprietario codigo')
            .exec();

        if (!negociacao) {
            throw new NotFoundException('Negociação não encontrada.');
        }
        return negociacao;
    }

    async findAll(empresaId: string, search?: string, status?: string) {
        const query: any = { empresa: new Types.ObjectId(empresaId) };

        if (status && status !== 'TODOS') {
            query.status = status;
        }

        let negociacoes = await this.negociacaoModel
            .find(query)
            .populate('imovel', 'titulo endereco cidade')
            .populate('cliente', 'nome email telefone endereco cidade')
            .sort({ updatedAt: -1 })
            .exec();

        if (search) {
            const searchLower = search.toLowerCase();
            negociacoes = negociacoes.filter(item => {
                const clienteNome = (item.cliente as any)?.nome?.toLowerCase() || '';
                const imovelTitulo = (item.imovel as any)?.titulo?.toLowerCase() || '';
                const imovelEndereco = (item.imovel as any)?.endereco?.toLowerCase() || '';

                return clienteNome.includes(searchLower) ||
                    imovelTitulo.includes(searchLower) ||
                    imovelEndereco.includes(searchLower);
            });
        }

        return negociacoes;
    }
    async updateStatus(
        negociacaoId: string,
        novoStatus: StatusNegociacao,
        empresaId: string,
        usuarioPayload: any,
        dataAgendamento?: string,
        dadosFinanceiros?: any
    ) {
        // 1. Buscamos a negociação (findOne já deve retornar um Documento do Mongoose)
        const negociacao = await this.findOne(negociacaoId, empresaId);

        if (negociacao.status === StatusNegociacao.FECHADO && novoStatus === StatusNegociacao.FECHADO) {
            throw new BadRequestException('Esta negociação já foi finalizada. Para alterar valores, utilize a opção "Refazer Negociação".');
        }

        // Lógica para Agendamento de Visita
        if (novoStatus === StatusNegociacao.VISITA) {
            if (!dataAgendamento) {
                throw new BadRequestException('Para mudar para Visita Agendada, é necessário informar a data e hora.');
            }

            await this.agendamentoService.create({
                imovelId: negociacao.imovel._id.toString(),
                clienteId: negociacao.cliente._id.toString(),
                dataHora: dataAgendamento,
                status: StatusAgendamento.PENDENTE
            }, usuarioPayload);
        }

        // Lógica para Fechamento e Geração Física das Parcelas no Banco
        if (novoStatus === StatusNegociacao.FECHADO && negociacao.status !== StatusNegociacao.FECHADO) {

            const imovel = negociacao.imovel as any;

            if (!imovel || !imovel.proprietario) {
                throw new BadRequestException('Não é possível fechar: Imóvel sem proprietário vinculado no cadastro.');
            }

            if (dadosFinanceiros) {
                // Chamada ao serviço que cria as parcelas na coleção 'Financeiro'
                await this.financeiroService.gerarFluxoFinanceiroFechamento(
                    negociacao,
                    imovel,
                    dadosFinanceiros
                );

                // IMPORTANTE: Atualiza o valor acordado e PERSISTE os termos financeiros na Negociação
                negociacao.valor_acordado = Number(dadosFinanceiros.valorTotal);

                // Atribui o objeto para que ele seja salvo no campo que adicionamos ao Schema
                negociacao.dadosFinanceiros = {
                    valorTotal: Number(dadosFinanceiros.valorTotal),
                    valorEntrada: Number(dadosFinanceiros.valorEntrada || 0),
                    qtdParcelas: Number(dadosFinanceiros.qtdParcelas),
                    valorParcela: Number(dadosFinanceiros.valorParcela),
                    diaVencimento: dadosFinanceiros.diaVencimento,
                    ajustePorcentagem: Number(dadosFinanceiros.ajustePorcentagem || 0), // AGORA SALVA
                    ajusteFixo: Number(dadosFinanceiros.ajusteFixo || 0)               // AGORA SALVA
                };
            } else {
                throw new BadRequestException('Dados financeiros são obrigatórios para concluir a negociação.');
            }

            // Marca o imóvel como indisponível
            await this.imovelService.update(negociacao.imovel._id.toString(), { disponivel: false }, empresaId);
            negociacao.data_fechamento = new Date();
        }

        // Atualização do Status e Timeline
        negociacao.status = novoStatus;
        negociacao.historico.push({
            descricao: `Status alterado para: ${novoStatus}${dadosFinanceiros ? ' (Parcelas Financeiras Geradas)' : ''}`,
            usuario_nome: usuarioPayload.nome || 'Sistema',
            data: new Date()
        });

        // Salva todas as alterações (incluindo o novo objeto dadosFinanceiros)
        const salvo = await negociacao.save();

        // Retorna o objeto completo atualizado
        return this.findOne(salvo._id.toString(), empresaId);
    }

    async create(dto: CreateNegociacaoDto, empresaId: string, usuarioNome: string): Promise<NegociacaoDocument> {
        await this.imovelService.findOne(dto.imovel, empresaId);

        const codigo = await this.generateNextCodigo(); // GERA O CÓDIGO AQUI

        const novaNegociacao = new this.negociacaoModel({
            ...dto,
            codigo, // SALVA O CÓDIGO
            empresa: new Types.ObjectId(empresaId),
            historico: [{
                descricao: `Negociação ${codigo} iniciada por ${usuarioNome}`,
                usuario_nome: usuarioNome,
                data: new Date()
            }]
        });

        const salva = await novaNegociacao.save();
        return this.findOne(salva._id.toString(), empresaId);
    }

    async addHistorico(negociacaoId: string, empresaId: string, descricao: string, usuarioNome: string) {
        return this.negociacaoModel.findOneAndUpdate(
            { _id: negociacaoId, empresa: new Types.ObjectId(empresaId) },
            {
                $push: {
                    historico: { descricao, usuario_nome: usuarioNome, data: new Date() }
                }
            },
            { new: true }
        ).populate('cliente').populate('imovel');
    }

    async cancelarNegociacaoFechada(negociacaoId: string, empresaId: string, usuarioNome: string) {
        const negociacao = await this.findOne(negociacaoId, empresaId);

        if (negociacao.status !== StatusNegociacao.FECHADO) {
            throw new BadRequestException('Apenas negociações fechadas podem ser estornadas por este método.');
        }

        // 1. Cancela as parcelas que ainda não foram pagas
        await this.financeiroService.cancelarParcelasPendentes(negociacaoId, empresaId);

        // 2. Libera o imóvel
        await this.imovelService.update(negociacao.imovel._id.toString(), { disponivel: true }, empresaId);

        // 3. Atualiza a negociação
        negociacao.status = StatusNegociacao.CANCELADO;
        negociacao.historico.push({
            descricao: `Negociação estornada e cancelada por ${usuarioNome}. Financeiro pendente foi anulado.`,
            usuario_nome: usuarioNome,
            data: new Date()
        });

        return await negociacao.save();
    }

    async refazerNegociacao(
        negociacaoId: string,
        empresaId: string,
        usuarioPayload: any,
        gerarNovaProspeccao: boolean = true // Default como true para manter compatibilidade
    ) {
        // 1. Busca a negociação original
        const antiga = await this.findOne(negociacaoId, empresaId);

        if (antiga.status !== StatusNegociacao.FECHADO && antiga.status !== StatusNegociacao.CANCELADO) {
            throw new BadRequestException('Apenas negociações fechadas ou canceladas podem ser refeitas.');
        }

        // 2. Se ela ainda estiver como FECHADO, cancelamos o financeiro e liberamos o imóvel
        if (antiga.status === StatusNegociacao.FECHADO) {
            await this.financeiroService.cancelarParcelasPendentes(negociacaoId, empresaId);
            await this.imovelService.update(antiga.imovel._id.toString(), { disponivel: true }, empresaId);

            antiga.status = StatusNegociacao.CANCELADO;
            antiga.historico.push({
                descricao: `Negociação estornada por ${usuarioPayload.nome}.${gerarNovaProspeccao ? ' Iniciando nova prospecção.' : ' Imóvel liberado.'}`,
                usuario_nome: usuarioPayload.nome,
                data: new Date()
            });
            await antiga.save();
        }

        // 3. Condicional para criar a NOVA negociação
        if (gerarNovaProspeccao) {
            const novaNegociacao = new this.negociacaoModel({
                imovel: antiga.imovel._id,
                cliente: antiga.cliente._id,
                empresa: antiga.empresa,
                tipo: antiga.tipo,
                status: StatusNegociacao.PROSPECCAO,
                valor_acordado: 0,
                observacoes_gerais: `Refilmagem da negociação anterior (ID: ${antiga._id})`,
                historico: [
                    {
                        descricao: `Negociação iniciada a partir do estorno da negociação ${antiga._id}`,
                        usuario_nome: usuarioPayload.nome,
                        data: new Date()
                    }
                ]
            });

            const salva = await novaNegociacao.save();
            // Retorna a nova para o frontend redirecionar
            return this.findOne(salva._id.toString(), empresaId);
        }

        // Se NÃO for para gerar nova, retorna a antiga já cancelada e atualizada
        return antiga;
    }
}