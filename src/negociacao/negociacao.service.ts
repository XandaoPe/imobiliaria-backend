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
            // ⭐️ CORREÇÃO: Populate completo para o Modal de Detalhes
            .populate('cliente', 'nome telefone email endereco cidade')
            .populate('imovel', 'titulo endereco cidade proprietario')
            .exec();

        if (!negociacao) {
            throw new NotFoundException('Negociação não encontrada.');
        }
        return negociacao;
    }

    async findAll(empresaId: string) {
        return this.negociacaoModel.find({ empresa: new Types.ObjectId(empresaId) })
            .populate('imovel', 'titulo endereco cidade')
            // ⭐️ CORREÇÃO: Adicionado endereco e cidade aqui também
            .populate('cliente', 'nome email telefone endereco cidade')
            .sort({ updatedAt: -1 })
            .exec();
    }

    async updateStatus(
        negociacaoId: string,
        novoStatus: StatusNegociacao,
        empresaId: string,
        usuarioPayload: any,
        dataAgendamento?: string
    ) {
        const negociacao = await this.negociacaoModel.findOne({
            _id: negociacaoId,
            empresa: new Types.ObjectId(empresaId)
        });

        if (!negociacao) throw new NotFoundException('Negociação não encontrada');

        if (novoStatus === 'VISITA') {
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

        // ⭐️ Lógica do Financeiro ao fechar
        if (novoStatus === StatusNegociacao.FECHADO && negociacao.status !== StatusNegociacao.FECHADO) {
            const imovel = await this.imovelService.findOne(negociacao.imovel.toString(), empresaId);

            if (!imovel || !imovel.proprietario) {
                throw new BadRequestException('Não é possível fechar a negociação: Imóvel sem proprietário vinculado.');
            }

            await this.financeiroService.gerarFluxoAluguel(negociacao, imovel as any);
        }

        negociacao.status = novoStatus;

        negociacao.historico.push({
            descricao: `Status alterado para: ${novoStatus}`,
            usuario_nome: usuarioPayload.nome || 'Sistema',
            data: new Date()
        });

        if (novoStatus === StatusNegociacao.ASSINADO || novoStatus === StatusNegociacao.FECHADO) {
            await this.imovelService.update(
                negociacao.imovel.toString(),
                { disponivel: false },
                empresaId
            );
            negociacao.data_fechamento = new Date();
        }

        const salvo = await negociacao.save();

        // Retorna o objeto populado para o front não precisar recarregar
        return this.findOne(salvo._id.toString(), empresaId);
    }

    async create(dto: CreateNegociacaoDto, empresaId: string, usuarioNome: string): Promise<Negociacao> {
        await this.imovelService.findOne(dto.imovel, empresaId);

        const novaNegociacao = new this.negociacaoModel({
            ...dto,
            valor_acordado: dto.valor_acordado || 0,
            empresa: new Types.ObjectId(empresaId),
            historico: [
                ...(dto.historico || []),
                {
                    descricao: `Negociação registrada no sistema por ${usuarioNome}`,
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
        ).populate('cliente', 'nome telefone endereco cidade').populate('imovel');
    }
}