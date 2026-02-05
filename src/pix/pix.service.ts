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

    async gerarQrCodePix(dados: GerarQrCodePixDto, empresaId: string, usuarioId?: string): Promise<any> {
        try {
            const lancamento = await this.financeiroService.findById(dados.lancamentoId, empresaId);
            if (!lancamento) throw new NotFoundException('Lançamento financeiro não encontrado');

            const transacaoExistente = await this.transacaoPixModel.findOne({
                lancamentoFinanceiro: new Types.ObjectId(dados.lancamentoId),
                status: { $in: [StatusTransacaoPix.PENDENTE, StatusTransacaoPix.GERADO] }
            });

            if (transacaoExistente) {
                throw new BadRequestException('Já existe um QR Code PIX ativo para este lançamento');
            }

            const { chaveDestino, nomeDestinatario } = await this.determinarDestinatario(lancamento, empresaId);

            const valor = dados.valorPersonalizado || lancamento.valor;
            const descricao = dados.descricaoPersonalizada || lancamento.descricao || 'PAGAMENTO';
            const txid = `ID${Date.now().toString().slice(-8)}`;

            // GERADOR NATIVO (Sem dependência de biblioteca problemática)
            const payloadPix = this.gerarPixStringNativa({
                chave: chaveDestino,
                valor,
                nome: nomeDestinatario,
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
                chaveDestinatario: chaveDestino,
                nomeDestinatario,
                valor,
                descricao,
                payloadPix,
                qrCodeBase64,
                status: StatusTransacaoPix.GERADO,
                dataExpiracao: this.calcularDataExpiracao(3),
                codigoCopiaCola: payloadPix,
            });

            const transacaoSalva = await transacaoPix.save();
            return this.formatarResposta(transacaoSalva);

        } catch (error) {
            console.error('Erro no PixService:', error);
            throw new BadRequestException(error.message);
        }
    }

    /**
     * Gerador de Payload PIX Nativo (Padrão BACEN)
     * Baseado no payload válido enviado pelo usuário
     */
    private gerarPixStringNativa(data: PixData): string {
        const format = (id: string, value: string) => id + value.length.toString().padStart(2, '0') + value;
        
        const sanitizar = (t: string, limit: number) => {
            return t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9 ]/gi, "").toUpperCase().substring(0, limit).trim();
        };

        // 00: Payload Format Indicator
        let payload = format('00', '01');
        
        // 26: Merchant Account Information - PIX
        const gui = format('00', 'br.gov.bcb.pix');
        const key = format('01', data.chave.includes('@') ? data.chave.toLowerCase().trim() : data.chave.replace(/\D/g, ''));
        payload += format('26', gui + key);

        // 52: Merchant Category Code
        payload += format('52', '0000');
        // 53: Transaction Currency (BRL)
        payload += format('53', '986');
        // 54: Transaction Amount
        payload += format('54', data.valor.toFixed(2));
        // 58: Country Code
        payload += format('58', 'BR');
        // 59: Merchant Name
        payload += format('59', sanitizar(data.nome, 25) || 'IMOBILIARIA');
        // 60: Merchant City
        payload += format('60', sanitizar(data.cidade, 15) || 'SAO PAULO');
        
        // 62: Additional Data Field (TXID)
        const txid = format('05', data.txid.substring(0, 25) || '***');
        payload += format('62', txid);

        // 63: CRC16 (Calculado sobre o payload até aqui + '6304')
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

    private async determinarDestinatario(lancamento: any, empresaId: string): Promise<{ chaveDestino: string; nomeDestinatario: string }> {
        let chave: string | undefined;
        let nome: string | undefined;

        if (lancamento.categoria === 'COMISSAO' && lancamento.comissionado) {
            const user = await this.usuarioModel.findById(lancamento.comissionado?._id || lancamento.comissionado);
            chave = user?.chavePix?.chave;
            nome = user?.nome;
        } else if (lancamento.categoria === 'REPASSE' && lancamento.cliente) {
            const cli = await this.clienteModel.findById(lancamento.cliente?._id || lancamento.cliente);
            chave = cli?.chavePix?.chave;
            nome = cli?.nome;
        } else {
            const emp = await this.empresaModel.findById(empresaId);
            chave = emp?.chavePix?.chave;
            nome = emp?.nome;
        }

        if (!chave || !nome) throw new Error('Destinatário não possui chave PIX configurada.');
        return { chaveDestino: chave, nomeDestinatario: nome };
    }

    private async obterCidadeEmpresa(empresaId: string): Promise<string> {
        try {
            const empresa = await this.empresaModel.findById(empresaId).lean() as any;
            return (empresa?.cidade || empresa?.endereco?.cidade || 'SAO PAULO');
        } catch {
            return 'SAO PAULO';
        }
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

    // --- Outros métodos permanecem os mesmos ---
    async reenviarQrCode(id: string, empresaId: string) {
        const t = await this.transacaoPixModel.findOne({ _id: new Types.ObjectId(id), empresa: new Types.ObjectId(empresaId) });
        if (!t) throw new NotFoundException('Transação não encontrada');
        
        const payload = this.gerarPixStringNativa({
            chave: t.chaveDestinatario,
            valor: t.valor,
            nome: t.nomeDestinatario,
            cidade: await this.obterCidadeEmpresa(empresaId),
            descricao: t.descricao,
            txid: `RE${Date.now().toString().slice(-8)}`
        });

        t.payloadPix = payload;
        t.qrCodeBase64 = await QRCode.toDataURL(payload, { width: 400 });
        const salva = await t.save();
        return this.formatarResposta(salva);
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