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
        private imovelService: ImovelService, // Precisamos injetar para mudar o status do imóvel
        private agendamentoService: AgendamentoService,
        private financeiroService: FinanceiroService, // ⭐️ Injeção do novo serviço
    ) { }

    async atualizarStatus(id: string, novoStatus: StatusNegociacao, empresaId: string) {
        // 1. Busca garantindo a empresa (Multitenancy)
        const negociacao = await this.negociacaoModel.findOne({ _id: id, empresa: new Types.ObjectId(empresaId) }).exec();

        // Correção do erro 'negociacao' é possivelmente 'null'
        if (!negociacao) {
            throw new NotFoundException('Negociação não encontrada.');
        }

        if (novoStatus === StatusNegociacao.FECHADO && negociacao.status !== StatusNegociacao.FECHADO) {
            // Correção: Agora passando imovelId e empresaId (2 argumentos)
            const imovel = await this.imovelService.findOne(negociacao.imovel.toString(), empresaId);

            // Dispara a automação financeira. 
            // O casting 'as any' ou garantir que findOne retorne ImovelDocument resolve o erro de tipo
            await this.financeiroService.gerarFluxoAluguel(negociacao, imovel as any);
        }

        negociacao.status = novoStatus;
        return negociacao.save();
    }

    async create(dto: CreateNegociacaoDto, empresaId: string, usuarioNome: string): Promise<Negociacao> {
        await this.imovelService.findOne(dto.imovel, empresaId);

        const novaNegociacao = new this.negociacaoModel({
            ...dto,
            valor_acordado: dto.valor_acordado || 0, // Garante um valor numérico
            empresa: new Types.ObjectId(empresaId),
            // Mescla o histórico que vem do front com a nota automática do sistema
            historico: [
                ...(dto.historico || []),
                {
                    descricao: `Negociação registrada no sistema por ${usuarioNome}`,
                    usuario_nome: usuarioNome,
                    data: new Date()
                }
            ]
        });

        return novaNegociacao.save();
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
        );
    }

    async updateStatus(
        negociacaoId: string,
        novoStatus: StatusNegociacao,
        empresaId: string,
        usuarioPayload: any, // 👈 Precisamos do payload do usuário (ID e Empresa)
        dataAgendamento?: string // 👈 Opcional, vindo do front
    ) {
        const negociacao = await this.negociacaoModel.findOne({
            _id: negociacaoId,
            empresa: new Types.ObjectId(empresaId)
        });

        if (!negociacao) throw new NotFoundException('Negociação não encontrada');

        // ⭐️ LÓGICA DE AGENDAMENTO AUTOMÁTICO
        if (novoStatus === 'VISITA') {
            if (!dataAgendamento) {
                throw new BadRequestException('Para mudar para Visita Agendada, é necessário informar a data e hora.');
            }

            await this.agendamentoService.create({
                imovelId: negociacao.imovel.toString(),
                clienteId: negociacao.cliente.toString(),
                dataHora: dataAgendamento,
                status: StatusAgendamento.PENDENTE
            }, usuarioPayload); // Passamos o payload para o multitenancy funcionar
        }

        negociacao.status = novoStatus;

        negociacao.historico.push({
            descricao: `Status alterado para: ${novoStatus}`,
            usuario_nome: usuarioPayload.nome || 'Sistema',
            data: new Date()
        });

        // Se a negociação for CONCLUÍDA, desativa o imóvel
        if (novoStatus === StatusNegociacao.ASSINADO || novoStatus === StatusNegociacao.FECHADO) {
            await this.imovelService.update(
                negociacao.imovel.toString(),
                { disponivel: false },
                empresaId
            );
            negociacao.data_fechamento = new Date();
        }

        return negociacao.save();
    }

    async findAll(empresaId: string) {
        return this.negociacaoModel.find({ empresa: new Types.ObjectId(empresaId) })
            .populate('imovel', 'titulo endereco')
            .populate('cliente', 'nome email')
            .sort({ updatedAt: -1 })
            .exec();
    }
}