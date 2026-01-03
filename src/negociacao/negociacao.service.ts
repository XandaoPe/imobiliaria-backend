import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Negociacao, NegociacaoDocument, StatusNegociacao } from './schemas/negociacao.schema';
import { CreateNegociacaoDto } from './dto/create-negociacao.dto';
import { ImovelService } from 'src/imovel/imovel.service';

@Injectable()
export class NegociacaoService {
    constructor(
        @InjectModel(Negociacao.name) private negociacaoModel: Model<NegociacaoDocument>,
        private imovelService: ImovelService, // Precisamos injetar para mudar o status do imóvel
    ) { }

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

    async updateStatus(negociacaoId: string, novoStatus: StatusNegociacao, empresaId: string) {
        const negociacao = await this.negociacaoModel.findOne({
            _id: negociacaoId,
            empresa: new Types.ObjectId(empresaId)
        });

        if (!negociacao) throw new NotFoundException('Negociação não encontrada');

        negociacao.status = novoStatus;

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