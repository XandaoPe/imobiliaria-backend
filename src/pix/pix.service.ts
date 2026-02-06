import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as QRCode from 'qrcode';

import { StatusTransacaoPix, TransacaoPix } from './schemas/transacao-pix.schema';
import { GerarQrCodePixDto } from './dto/gerar-qrcode-pix.dto';
import { Usuario } from 'src/usuario/schemas/usuario.schema';
import { Cliente } from 'src/cliente/schemas/cliente.schema';
import { Empresa } from 'src/empresa/schemas/empresa.schema';
import { FinanceiroService } from 'src/financeiro/financeiro.service';

interface PixData {
    chave: string;
    tipo: string;
    valor: number;
    nome: string;
    cidade: string;
    descricao: string;
    txid: string;
}

@Injectable()
export class PixService {
    constructor(
        @InjectModel(Usuario.name) private usuarioModel: Model<Usuario>,
        @InjectModel(Cliente.name) private clienteModel: Model<Cliente>,
        @InjectModel(Empresa.name) private empresaModel: Model<Empresa>,
        @InjectModel(TransacaoPix.name) private transacaoPixModel: Model<TransacaoPix>,
        @Inject(forwardRef(() => FinanceiroService))
        private financeiroService: FinanceiroService,
    ) { }

    async gerarQrCodePix(dados: any, empresaId: string, usuarioId?: string): Promise<any> {
        try {
            const lancamento = await this.financeiroService.findById(dados.lancamentoId, empresaId);
            if (!lancamento) throw new NotFoundException('Lançamento financeiro não encontrado');

            // --- CORREÇÃO AQUI: Verificamos se NÃO é para forçar antes de retornar a existente ---
            if (!dados.forcarNovo) {
                const transacaoExistente = await this.transacaoPixModel.findOne({
                    lancamentoFinanceiro: new Types.ObjectId(dados.lancamentoId),
                    status: { $in: [StatusTransacaoPix.PENDENTE, StatusTransacaoPix.GERADO] }
                });

                if (transacaoExistente) {
                    return {
                        aviso: 'PAGAMENTO JÁ SOLICITADO ANTERIORMENTE',
                        alerta: 'Um QR Code para este lançamento já foi gerado. Antes de prosseguir, verifique no extrato do seu banco se o pagamento já não foi efetuado.',
                        ...this.formatarResposta(transacaoExistente)
                    };
                }
            } else {
                // Se forçarNovo for true, invalidamos as anteriores para não confundir o financeiro
                await this.transacaoPixModel.updateMany(
                    {
                        lancamentoFinanceiro: new Types.ObjectId(dados.lancamentoId),
                        status: { $in: [StatusTransacaoPix.PENDENTE, StatusTransacaoPix.GERADO] }
                    },
                    { $set: { status: StatusTransacaoPix.CANCELADO, observacoes: 'Substituído por novo QR Code' } }
                );
            }

            // AGORA BUSCAMOS O DESTINATÁRIO (Isso pegará a chave nova que você alterou no cadastro)
            const destinatario = await this.determinarDestinatario(lancamento, empresaId);
            const valor = dados.valorPersonalizado || lancamento.valor;
            const descricao = dados.descricaoPersonalizada || lancamento.descricao || 'PAGAMENTO';

            // Geramos um TXID novo para garantir que o QR Code mude visualmente
            const txid = `ID${Date.now().toString().slice(-8)}`;

            const payloadPix = this.gerarPixStringNativa({
                chave: destinatario.chaveDestino,
                tipo: destinatario.tipoChave,
                valor,
                nome: destinatario.nomeDestinatario,
                cidade: await this.obterCidadeEmpresa(empresaId),
                descricao,
                txid
            });

            const qrCodeBase64 = await QRCode.toDataURL(payloadPix, {
                errorCorrectionLevel: 'M',
                margin: 2,
                width: 400
            });

            const transacaoPix = new this.transacaoPixModel({
                lancamentoFinanceiro: new Types.ObjectId(dados.lancamentoId),
                empresa: new Types.ObjectId(empresaId),
                usuarioSolicitante: usuarioId ? new Types.ObjectId(usuarioId) : undefined,
                chaveDestinatario: destinatario.chaveDestino,
                tipoChave: destinatario.tipoChave,
                nomeDestinatario: destinatario.nomeDestinatario,
                valor,
                descricao,
                payloadPix,
                qrCodeBase64,
                status: StatusTransacaoPix.GERADO,
                dataExpiracao: this.calcularDataExpiracao(3),
                codigoCopiaCola: payloadPix,
            });

            const transacaoSalva = await transacaoPix.save();

            // Retornamos SEM os campos 'aviso' e 'alerta' pois este é um novo
            return this.formatarResposta(transacaoSalva);

        } catch (error) {
            console.error('Erro no PixService:', error);
            throw new BadRequestException(error.message);
        }
    }

    async reenviarQrCode(id: string, empresaId: string) {
        const t = await this.transacaoPixModel.findOne({
            _id: new Types.ObjectId(id),
            empresa: new Types.ObjectId(empresaId)
        });

        if (!t) throw new NotFoundException('Transação não encontrada');

        const payload = this.gerarPixStringNativa({
            chave: t.chaveDestinatario,
            tipo: (t as any).tipoChave || 'CHAVE_ALEATORIA', // 🛡️ Cast temporário enquanto o Schema compila
            valor: t.valor,
            nome: t.nomeDestinatario,
            cidade: await this.obterCidadeEmpresa(empresaId),
            descricao: t.descricao,
            txid: `RE${Date.now().toString().slice(-8)}`
        });

        t.payloadPix = payload;
        t.qrCodeBase64 = await QRCode.toDataURL(payload, { width: 400 });
        t.status = StatusTransacaoPix.GERADO;

        const salva = await t.save();
        return this.formatarResposta(salva);
    }

    private gerarPixStringNativa(data: PixData): string {
        const format = (id: string, value: string) => id + value.length.toString().padStart(2, '0') + value;

        const sanitizar = (t: string, limit: number) => {
            if (!t) return '';
            return t.normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/[^A-Z0-9 ]/gi, "")
                .toUpperCase()
                .trim()
                .substring(0, limit);
        };

        // --- TRATAMENTO DE CHAVE ---
        let chaveFinal = data.chave.trim();
        const tipo = data.tipo?.toUpperCase();

        if (tipo === 'TELEFONE') {
            const apenasNumeros = chaveFinal.replace(/\D/g, '');
            chaveFinal = apenasNumeros.length <= 11 ? `+55${apenasNumeros}` : `+${apenasNumeros}`;
        } else if (tipo === 'EMAIL') {
            chaveFinal = chaveFinal.toLowerCase();
        } else if (tipo === 'CPF' || tipo === 'CNPJ') {
            chaveFinal = chaveFinal.replace(/\D/g, '');
        } else if (tipo === 'CHAVE_ALEATORIA') {
            // 🔑 IMPORTANTE: Chave aleatória (UUID) deve manter os hífens se existirem
            chaveFinal = chaveFinal.toLowerCase();
        }

        // 00: Payload Format Indicator
        let payload = format('00', '01');

        // 26: Merchant Account Information - PIX
        // Mudado para BR.GOV.BCB.PIX em maiúsculo conforme seu exemplo correto
        const gui = format('00', 'BR.GOV.BCB.PIX');
        const key = format('01', chaveFinal);
        payload += format('26', gui + key);

        // 52: Merchant Category Code
        payload += format('52', '0000');
        // 53: Transaction Currency (BRL)
        payload += format('53', '986');
        // 54: Transaction Amount
        payload += format('54', data.valor.toFixed(2));
        // 58: Country Code
        payload += format('58', 'BR');

        // No seu código correto, nome (59) e cidade (60) estão como "N" e "C"
        // Para manter compatibilidade total, vamos usar o sanitizar, 
        // mas se for vazio, usamos o padrão do seu exemplo.
        payload += format('59', sanitizar(data.nome, 25) || 'N');
        payload += format('60', sanitizar(data.cidade, 15) || 'C');

        // 62: Additional Data Field (TXID)
        // 🔑 AJUSTE TXID: Seu exemplo funcional usa "***" (0503***)
        const txidValue = data.txid === '***' ? '***' : (data.txid || '***');
        const txidField = format('05', txidValue);
        payload += format('62', txidField);

        // 63: CRC16
        payload += '6304';
        payload += this.calcularCRC16(payload);

        return payload;
    }

    private calcularCRC16(payload: string): string {
        let result = 0xFFFF;
        for (let i = 0; i < payload.length; i++) {
            result ^= (payload.charCodeAt(i) << 8);
            for (let j = 0; j < 8; j++) {
                if ((result & 0x8000) !== 0) {
                    result = (result << 1) ^ 0x1021;
                } else {
                    result <<= 1;
                }
            }
        }
        return (result & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
    }

    private async determinarDestinatario(lancamento: any, empresaId: string): Promise<{ chaveDestino: string; nomeDestinatario: string; tipoChave: string }> {
        let chaveInfo: any;
        let nome: string | undefined;

        if (lancamento.categoria === 'COMISSAO' && lancamento.comissionado) {
            const user = await this.usuarioModel.findById(lancamento.comissionado?._id || lancamento.comissionado);
            chaveInfo = user?.chavePix;
            nome = user?.nome;
        } else if (lancamento.categoria === 'REPASSE' && lancamento.cliente) {
            const cli = await this.clienteModel.findById(lancamento.cliente?._id || lancamento.cliente);
            chaveInfo = cli?.chavePix;
            nome = cli?.nome;
        } else {
            const emp = await this.empresaModel.findById(empresaId);
            chaveInfo = emp?.chavePix;
            nome = emp?.nome;
        }

        if (!chaveInfo?.chave || !nome) throw new Error('Destinatário não possui chave PIX configurada.');

        return {
            chaveDestino: chaveInfo.chave,
            nomeDestinatario: nome,
            tipoChave: chaveInfo.tipo || 'CHAVE_ALEATORIA'
        };
    }

    private async obterCidadeEmpresa(empresaId: string): Promise<string> {
        try {
            const empresa = await this.empresaModel.findById(empresaId).lean() as any;
            return (empresa?.cidade || 'SAO PAULO');
        } catch { return 'SAO PAULO'; }
    }

    private calcularDataExpiracao(dias: number): string {
        const d = new Date();
        d.setDate(d.getDate() + dias);
        return d.toISOString().split('T')[0];
    }

    private formatarResposta(t: any) {
        return {
            transacaoId: t._id.toString(),
            qrCodeBase64: t.qrCodeBase64,
            codigoPix: t.payloadPix,
            valor: t.valor,
            destinatario: t.nomeDestinatario,
            status: t.status,
            dataExpiracao: t.dataExpiracao
        };
    }

    async obterEstatisticas(empresaId: string) {
        const stats = await this.transacaoPixModel.aggregate([
            { $match: { empresa: new Types.ObjectId(empresaId) } },
            { $group: { _id: '$status', total: { $sum: 1 }, valorTotal: { $sum: '$valor' } } }
        ]);
        return stats.reduce((acc, curr) => {
            acc[curr._id] = { quantidade: curr.total, valor: curr.valorTotal };
            return acc;
        }, {});
    }

    async buscarTransacaoPorId(id: string, empresaId: string) {
        return this.transacaoPixModel.findOne({ _id: new Types.ObjectId(id), empresa: new Types.ObjectId(empresaId) }).lean();
    }

    async listarTransacoesPorEmpresa(empresaId: string, filtros: any) {
        const query: any = { empresa: new Types.ObjectId(empresaId) };
        if (filtros.status) query.status = filtros.status;
        return this.transacaoPixModel.find(query).sort({ createdAt: -1 }).limit(filtros.limit || 50).exec();
    }

    async atualizarStatusTransacao(id: string, empresaId: string, status: StatusTransacaoPix, extra?: any) {
        const t = await this.transacaoPixModel.findOneAndUpdate(
            { _id: new Types.ObjectId(id), empresa: new Types.ObjectId(empresaId) },
            { $set: { status, ...extra } },
            { new: true }
        ).exec();
        if (status === StatusTransacaoPix.PAGO && t) {
            await this.financeiroService.registrarPagamento(t.lancamentoFinanceiro.toString(), empresaId, {
                valorPago: t.valor,
                dataPagamento: new Date().toISOString(),
                observacoes: extra?.observacoes || 'Pago via PIX'
            });
        }
        return t;
    }

    async cancelarTransacao(id: string, empresaId: string, motivo?: string) {
        return this.atualizarStatusTransacao(id, empresaId, StatusTransacaoPix.CANCELADO, { observacoes: motivo });
    }

    async verificarTransacoesExpiradas(empresaId: string): Promise<number> {
        const hoje = new Date().toISOString().split('T')[0];
        const res = await this.transacaoPixModel.updateMany(
            { empresa: new Types.ObjectId(empresaId), status: { $in: [StatusTransacaoPix.GERADO, StatusTransacaoPix.PENDENTE] }, dataExpiracao: { $lt: hoje } },
            { $set: { status: StatusTransacaoPix.EXPIRADO } }
        ).exec();
        return res.modifiedCount;
    }
}