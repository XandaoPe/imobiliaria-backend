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
        private imovelService: ImovelService,
        private agendamentoService: AgendamentoService,
        private financeiroService: FinanceiroService,
    ) { }

    async findOne(id: string, empresaId: string): Promise<Negociacao> {
        const negociacao = await this.negociacaoModel
            .findOne({ _id: id, empresa: new Types.ObjectId(empresaId) })
            .populate('cliente', 'nome telefone email endereco cidade')
            .populate('imovel', 'titulo endereco cidade proprietario')
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
        const negociacao = await this.negociacaoModel.findOne({
            _id: negociacaoId,
            empresa: new Types.ObjectId(empresaId)
        });

        if (!negociacao) throw new NotFoundException('Negociação não encontrada');

        // Lógica para Agendamento de Visita
        if (novoStatus === StatusNegociacao.VISITA) {
            if (!dataAgendamento) {
                throw new BadRequestException('Para mudar para Visita Agendada, é necessário informar a data e hora.');
            }

            await this.agendamentoService.create({
                imovelId: negociacao.imovel.toString(),
                clienteId: negociacao.cliente.toString(),
                dataHora: dataAgendamento,
                status: StatusAgendamento.PENDENTE
            }, usuarioPayload);
        }

        // Lógica para Fechamento e Financeiro
        if (novoStatus === StatusNegociacao.FECHADO && negociacao.status !== StatusNegociacao.FECHADO) {
            const imovel = await this.imovelService.findOne(negociacao.imovel.toString(), empresaId);

            if (!imovel || !imovel.proprietario) {
                throw new BadRequestException('Não é possível fechar: Imóvel sem proprietário vinculado.');
            }

            if (dadosFinanceiros) {
                await this.financeiroService.gerarFluxoFinanceiroFechamento(negociacao, imovel as any, dadosFinanceiros);
                negociacao.valor_acordado = dadosFinanceiros.valorTotal;
            }

            await this.imovelService.update(negociacao.imovel.toString(), { disponivel: false }, empresaId);
            negociacao.data_fechamento = new Date();
        }

        // Atualização do Histórico
        negociacao.status = novoStatus;
        negociacao.historico.push({
            descricao: `Status alterado para: ${novoStatus}${dadosFinanceiros ? ' (Financeiro Gerado)' : ''}`,
            usuario_nome: usuarioPayload.nome || 'Sistema',
            data: new Date()
        });

        const salvo = await negociacao.save();
        return this.findOne(salvo._id.toString(), empresaId);
    }

    async create(dto: CreateNegociacaoDto, empresaId: string, usuarioNome: string): Promise<Negociacao> {
        await this.imovelService.findOne(dto.imovel, empresaId);

        const novaNegociacao = new this.negociacaoModel({
            ...dto,
            valor_acordado: dto.valor_acordado || 0,
            empresa: new Types.ObjectId(empresaId),
            historico: [
                {
                    descricao: `Negociação iniciada por ${usuarioNome}`,
                    usuario_nome: usuarioNome,
                    data: new Date()
                }
            ]
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
}