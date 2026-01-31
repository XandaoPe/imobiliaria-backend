import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Negociacao, NegociacaoDocument, StatusNegociacao } from './schemas/negociacao.schema';
import { CreateNegociacaoDto } from './dto/create-negociacao.dto';
import { ImovelService } from 'src/imovel/imovel.service';
import { AgendamentoService } from 'src/agendamento/agendamento.service';
import { StatusAgendamento } from 'src/agendamento/schemas/agendamento.schema';
import { FinanceiroService } from 'src/financeiro/financeiro.service';
import { Usuario, UsuarioDocument } from 'src/usuario/schemas/usuario.schema';
import { NotificacaoService } from 'src/notificacao/notificacao.service';

// Interfaces auxiliares
interface ClientePopulado {
    _id: Types.ObjectId;
    nome: string;
    telefone: string;
    email: string;
    endereco?: string;
    cidade?: string;
}

interface ImovelPopulado {
    _id: Types.ObjectId;
    titulo: string;
    endereco: string;
    cidade: string;
    proprietario?: Types.ObjectId;
    codigo?: string;
}

@Injectable()
export class NegociacaoService {
    constructor(
        @InjectModel(Negociacao.name) private negociacaoModel: Model<NegociacaoDocument>,
        @InjectModel('Counter') private counterModel: Model<any>,
        @InjectModel(Usuario.name) private usuarioModel: Model<UsuarioDocument>,
        private imovelService: ImovelService,
        private agendamentoService: AgendamentoService,
        private financeiroService: FinanceiroService,
        private notificacaoService: NotificacaoService,
    ) { }

    private extrairTokens(usuarios: any[]): string[] {
        const tokens: string[] = [];

        usuarios.forEach(u => {
            let token = u.pushToken;

            // Se for array, pega o último item
            if (Array.isArray(token)) {
                if (token.length > 0) {
                    token = token[token.length - 1];
                } else {
                    token = null;
                }
            }

            // Se for string válida, adiciona
            if (token && typeof token === 'string' && token.length > 10) {
                tokens.push(token);
            }
        });

        return tokens;
    }

    private async generateNextCodigo(): Promise<string> {
        const counter = await this.counterModel.findOneAndUpdate(
            { nome: 'negociacao_seq' },
            { $inc: { seq: 1 } },
            { new: true, upsert: true }
        );

        const ano = new Date().getFullYear();
        const sequencial = counter.seq.toString().padStart(4, '0');
        return `NEG-${ano}-${sequencial}`;
    }

    async findOne(id: string, empresaId: string): Promise<NegociacaoDocument> {
        const negociacao = await this.negociacaoModel
            .findOne({ _id: id, empresa: new Types.ObjectId(empresaId) })
            .populate('cliente', 'nome telefone email endereco cidade')
            .populate('vendedor', 'nome email')
            .populate({
                path: 'imovel',
                select: 'titulo endereco cidade proprietario codigo',
                populate: {
                    path: 'proprietario',
                    model: 'Cliente',
                    select: 'nome email telefone'
                }
            })
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
            .populate('cliente', 'nome email telefone endereco cidade')
            .populate({
                path: 'imovel',
                select: 'titulo endereco cidade proprietario',
                populate: {
                    path: 'proprietario',
                    select: 'nome'
                }
            })
            .sort({ updatedAt: -1 })
            .exec();

        if (search) {
            const searchLower = search.toLowerCase();
            negociacoes = negociacoes.filter(item => {
                const cliente = item.cliente as unknown as ClientePopulado;
                const imovel = item.imovel as unknown as ImovelPopulado;

                const clienteNome = cliente?.nome?.toLowerCase() || '';
                const imovelTitulo = imovel?.titulo?.toLowerCase() || '';
                const imovelEndereco = imovel?.endereco?.toLowerCase() || '';

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
        const negociacao = await this.findOne(negociacaoId, empresaId);

        if (negociacao.status === StatusNegociacao.FECHADO && novoStatus === StatusNegociacao.FECHADO) {
            throw new BadRequestException('Esta negociação já foi finalizada. Para alterar valores, utilize a opção "Refazer Negociação".');
        }

        if (novoStatus === StatusNegociacao.VISITA) {
            if (!dataAgendamento) {
                throw new BadRequestException('Para mudar para Visita Agendada, é necessário informar a data e hora.');
            }

            // CORREÇÃO: Extrair apenas a data (YYYY-MM-DD) do timestamp
            const dataAgendamentoDate = new Date(dataAgendamento);
            if (isNaN(dataAgendamentoDate.getTime())) {
                throw new BadRequestException('Data de agendamento inválida.');
            }

            // Extrair apenas a parte da data (sem hora, fuso horário)
            const dataVisitaApenas = dataAgendamentoDate.toISOString().split('T')[0];

            await this.agendamentoService.create({
                imovelId: negociacao.imovel._id.toString(),
                clienteId: negociacao.cliente._id.toString(),
                dataHora: dataAgendamento, // Mantém timestamp completo para agendamento
                status: StatusAgendamento.PENDENTE
            }, usuarioPayload);

            // Grava apenas a data na negociação
            negociacao.dataAgendamento = dataVisitaApenas;
        }

        if (novoStatus === StatusNegociacao.FECHADO && negociacao.status !== StatusNegociacao.FECHADO) {
            const imovel = negociacao.imovel as any;

            if (!imovel || !imovel.proprietario) {
                throw new BadRequestException('Não é possível fechar: Imóvel sem proprietário vinculado no cadastro.');
            }

            if (dadosFinanceiros) {
                if (dadosFinanceiros.tipoNegocio) {
                    negociacao.tipo = dadosFinanceiros.tipoNegocio;
                }

                // Passa os dados financeiros COMPLETOS (incluindo comissões se existirem)
                await this.financeiroService.gerarFluxoFinanceiroFechamento(
                    negociacao,
                    imovel,
                    dadosFinanceiros // Já contém comissões se enviadas pelo frontend
                );

                negociacao.valor_acordado = Number(dadosFinanceiros.valorTotal);

                // Salva os dados financeiros completos, incluindo comissões
                negociacao.dadosFinanceiros = {
                    valorTotal: Number(dadosFinanceiros.valorTotal),
                    valorEntrada: Number(dadosFinanceiros.valorEntrada || 0),
                    qtdParcelas: Number(dadosFinanceiros.qtdParcelas),
                    valorParcela: Number(dadosFinanceiros.valorParcela),
                    diaVencimento: dadosFinanceiros.diaVencimento,
                    ajustePorcentagem: Number(dadosFinanceiros.ajustePorcentagem || 0),
                    ajusteFixo: Number(dadosFinanceiros.ajusteFixo || 0),
                    // Salva as comissões se existirem
                    ...(dadosFinanceiros.comissoes && {
                        comissoes: dadosFinanceiros.comissoes
                    })
                };
            } else {
                throw new BadRequestException('Dados financeiros são obrigatórios para concluir a negociação.');
            }

            await this.imovelService.update(negociacao.imovel._id.toString(), { disponivel: false }, empresaId);
            negociacao.data_fechamento = new Date();
        }

        // Adiciona a informação da data ao histórico se for VISITA
        const descricaoHistorico = (novoStatus === StatusNegociacao.VISITA && dataAgendamento)
            ? `Status alterado para: ${novoStatus} (Data: ${dataAgendamento})`
            : `Status alterado para: ${novoStatus}${dadosFinanceiros ? ' (Parcelas Financeiras Geradas)' : ''}`;

        negociacao.status = novoStatus;
        negociacao.historico.push({
            descricao: descricaoHistorico,
            usuario_nome: usuarioPayload.nome || 'Sistema',
            data: new Date()
        });

        const salvo = await negociacao.save();
        return this.findOne(salvo._id.toString(), empresaId);
    }

    async create(dto: CreateNegociacaoDto, empresaId: string, usuarioNome: string): Promise<NegociacaoDocument> {
        await this.imovelService.findOne(dto.imovel, empresaId);

        const codigo = await this.generateNextCodigo();

        const novaNegociacao = new this.negociacaoModel({
            ...dto,
            codigo,
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

        await this.financeiroService.cancelarParcelasPendentes(negociacaoId, empresaId);
        await this.imovelService.update(negociacao.imovel._id.toString(), { disponivel: true }, empresaId);

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
        gerarNovaProspeccao: boolean = true
    ) {
        const antiga = await this.findOne(negociacaoId, empresaId);

        if (antiga.status !== StatusNegociacao.FECHADO && antiga.status !== StatusNegociacao.CANCELADO) {
            throw new BadRequestException('Apenas negociações fechadas ou canceladas podem ser refeitas.');
        }

        // 1. Estorno da negociação antiga
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

        // 2. Geração da NOVA negociação com NOVO CÓDIGO
        if (gerarNovaProspeccao) {
            const novoCodigo = await this.generateNextCodigo();

            const novaNegociacao = new this.negociacaoModel({
                codigo: novoCodigo,
                imovel: antiga.imovel._id,
                cliente: antiga.cliente._id,
                empresa: antiga.empresa,
                tipo: antiga.tipo,
                status: StatusNegociacao.PROSPECCAO,
                valor_acordado: 0,
                observacoes_gerais: `Negociação gerada a partir do estorno da negociação ${antiga.codigo}`,
                historico: [
                    {
                        descricao: `Nova prospecção #${novoCodigo} iniciada devido ao estorno da negociação anterior #${antiga.codigo}`,
                        usuario_nome: usuarioPayload.nome,
                        data: new Date()
                    }
                ]
            });

            const salva = await novaNegociacao.save();
            return this.findOne(salva._id.toString(), empresaId);
        }

        return antiga;
    }

    async notificarVisitaAgendada(
        negociacaoId: string,
        dados: {
            dataVisita: string;
            horaVisita: string;
            imovelTitulo: string;
            clienteNome: string;
            corretorNome: string;
        },
        empresaId: string,
        usuario: any
    ) {
        try {
            console.log(`=== INICIANDO NOTIFICAÇÃO DE VISITA ===`);
            console.log(`Negociação ID: ${negociacaoId}`);
            console.log(`Empresa ID: ${empresaId}`);

            // CORREÇÃO: Obter ID do usuário corretamente
            const usuarioId = usuario._id || usuario.userId || usuario.sub;
            console.log(`Usuário que agendou: ${usuario.nome} (ID: ${usuarioId})`);

            if (!usuarioId) {
                console.error('❌ ERRO: ID do usuário não encontrado no payload');
                console.log('Payload do usuário:', usuario);
                return {
                    success: false,
                    message: 'ID do usuário não encontrado'
                };
            }

            // 1. Buscar a negociação
            const negociacao = await this.findOne(negociacaoId, empresaId);

            // Cast para tipos populados
            const cliente = negociacao.cliente as unknown as ClientePopulado;
            const imovel = negociacao.imovel as unknown as ImovelPopulado;

            // 2. Buscar TODOS os corretores/gerentes da empresa para notificar
            // EXCETO o usuário que está criando a visita (para evitar auto-notificação)
            const usuarios = await this.usuarioModel.find({
                empresa: new Types.ObjectId(empresaId),
                _id: { $ne: new Types.ObjectId(usuarioId) } // Usar usuarioId corrigido
            });

        // ... resto do método continua igual ...
            console.log(`Total de usuários encontrados: ${usuarios.length}`);

            // Extrair e filtrar tokens válidos
            const tokens = this.extrairTokens(usuarios);

            usuarios.forEach((u: any, index) => {
                const pushToken = u.pushToken;

                console.log(`Usuário [${index + 1}]: ${u.nome}`);
                console.log(`  Tipo do pushToken: ${Array.isArray(pushToken) ? 'ARRAY' : typeof pushToken}`);

                if (pushToken) {
                    if (Array.isArray(pushToken)) {
                        // Se é um array, pega o ÚLTIMO token (mais recente)
                        const ultimoToken = pushToken[pushToken.length - 1];
                        console.log(`  É array com ${pushToken.length} tokens`);
                        console.log(`  Último token: ${ultimoToken ? ultimoToken.substring(0, 30) + '...' : 'vazio'}`);

                        if (ultimoToken && typeof ultimoToken === 'string' && ultimoToken.length > 10) {
                            tokens.push(ultimoToken);
                            console.log(`  ✅ Token adicionado (do array)`);
                        }
                    } else if (typeof pushToken === 'string' && pushToken.length > 10) {
                        // Se é uma string direta
                        tokens.push(pushToken);
                        console.log(`  ✅ Token adicionado (string direta)`);
                    } else {
                        console.log(`  ❌ Token inválido`);
                    }
                } else {
                    console.log(`  ❌ Sem pushToken`);
                }
                console.log('---');
            });

            if (tokens.length === 0) {
                console.log('⚠️ Nenhum token de push disponível para notificar');
                return {
                    success: false,
                    message: 'Nenhum token de push disponível',
                    debug: {
                        usuariosEncontrados: usuarios.length,
                        usuariosComToken: 0
                    }
                };
            }

            console.log(`📤 Total de tokens válidos: ${tokens.length}`);
            tokens.forEach((token, i) => {
                console.log(`  Token ${i + 1}: ${token.substring(0, 30)}...`);
            });

            // 3. Preparar mensagem
            const title = '📍 Nova Visita Agendada';
            const body = `${dados.corretorNome} agendou visita para ${dados.dataVisita} às ${dados.horaVisita}`;

            const notificationData = {
                type: 'nova_visita',
                negociacaoId,
                imovelId: imovel._id.toString(),
                imovelTitulo: dados.imovelTitulo,
                dataVisita: dados.dataVisita,
                horaVisita: dados.horaVisita,
                clienteNome: dados.clienteNome,
                corretorNome: dados.corretorNome,
                link: `/negociacoes/${negociacaoId}`
            };

            // 4. Enviar notificação
            const result = await this.notificacaoService.sendPush(
                tokens,
                title,
                body,
                notificationData
            );

            // 5. Log para debug
            console.log(`📅 Notificação de visita enviada para ${tokens.length} usuários`);
            console.log(`✅ Resultado: ${result.message}`);
            console.log(`✅ Sucessos: ${result.successCount}, Falhas: ${result.failureCount}`);

            return {
                success: true,
                message: result.message,
                tokensEnviados: tokens.length,
                negociacao: {
                    codigo: negociacao.codigo,
                    cliente: cliente.nome,
                    imovel: imovel.titulo,
                    dataVisita: dados.dataVisita,
                    horaVisita: dados.horaVisita
                },
                debug: {
                    usuariosEncontrados: usuarios.length,
                    tokensEnviados: tokens.length,
                    successCount: result.successCount,
                    failureCount: result.failureCount
                }
            };

        } catch (error: any) {
            console.error('❌ Erro ao enviar notificação de visita:', error);
            return {
                success: false,
                message: 'Erro ao enviar notificação: ' + error.message
            };
        }
    }
}