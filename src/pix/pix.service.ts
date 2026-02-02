// src/pix/services/pix.service.ts - VERSÃO CORRIGIDA
import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as QRCode from 'qrcode';

import { TransacaoPix, TransacaoPixDocument, StatusTransacaoPix } from './schemas/transacao-pix.schema';
import { FinanceiroService } from '../financeiro/financeiro.service';
import { UsuarioService } from '../usuario/usuario.service';
import { ClienteService } from '../cliente/cliente.service';
import { EmpresaService } from '../empresa/empresa.service';
import { GerarQrCodePixDto } from './dto/gerar-qrcode-pix.dto';

@Injectable()
export class PixService {
    constructor(
        @InjectModel(TransacaoPix.name) private transacaoPixModel: Model<TransacaoPixDocument>,
        @Inject(forwardRef(() => FinanceiroService))
        private readonly financeiroService: FinanceiroService,
        private readonly usuarioService: UsuarioService,
        private readonly clienteService: ClienteService,
        private readonly empresaService: EmpresaService,
    ) { }

    /**
     * Gera QR Code PIX para um lançamento financeiro
     */
    async gerarQrCodePix(dados: GerarQrCodePixDto, empresaId: string, usuarioId?: string): Promise<any> {
        // 1. Buscar lançamento financeiro
        const lancamento = await this.financeiroService.findById(dados.lancamentoId, empresaId);

        if (!lancamento) {
            throw new NotFoundException('Lançamento financeiro não encontrado');
        }

        // 2. Verificar se já existe transação PIX para este lançamento
        const transacaoExistente = await this.transacaoPixModel.findOne({
            lancamentoFinanceiro: new Types.ObjectId(dados.lancamentoId),
            status: { $in: [StatusTransacaoPix.PENDENTE, StatusTransacaoPix.GERADO] }
        });

        if (transacaoExistente) {
            throw new BadRequestException('Já existe um QR Code PIX ativo para este lançamento');
        }

        // 3. Determinar destinatário baseado no tipo de lançamento
        const { chaveDestino, nomeDestinatario, tipoDestinatario } = await this.determinarDestinatario(lancamento, empresaId);

        if (!chaveDestino) {
            throw new BadRequestException('Destinatário não possui chave PIX cadastrada');
        }

        // 4. Preparar dados para o PIX
        const valor = dados.valorPersonalizado || lancamento.valor;
        const descricao = dados.descricaoPersonalizada || lancamento.descricao;
        const txid = `IMOB${Date.now()}${Math.random().toString(36).substr(2, 9)}`;

        // 5. Gerar payload PIX (implementação manual)
        const payloadPix = this.gerarPayloadPixManual({
            chaveDestino,
            nomeDestinatario,
            valor,
            descricao,
            txid,
            cidadeRemetente: 'São Paulo' // TODO: Buscar cidade da empresa
        });

        // 6. Gerar QR Code como imagem base64
        const qrCodeBase64 = await this.gerarQrCodeBase64(payloadPix);

        // 7. Criar registro da transação PIX
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
            dataExpiracao: this.calcularDataExpiracao(3), // Expira em 3 dias
            codigoCopiaCola: payloadPix,
            observacoes: `Gerado para ${tipoDestinatario}: ${nomeDestinatario}`
        });

        const transacaoSalva = await transacaoPix.save();
        const transacaoObj = transacaoSalva.toObject(); // Converter para objeto plano

        // 8. Retornar dados para o frontend
        return {
            transacaoId: transacaoObj._id.toString(),
            lancamentoId: lancamento._id.toString(),
            qrCodeBase64: transacaoObj.qrCodeBase64,
            codigoPix: transacaoObj.payloadPix,
            valor: transacaoObj.valor,
            destinatario: transacaoObj.nomeDestinatario,
            descricao: transacaoObj.descricao,
            dataExpiracao: transacaoObj.dataExpiracao,
            dataCriacao: transacaoObj.createdAt,
            status: transacaoObj.status
        };
    }

    /**
 * Normaliza número de telefone para formato PIX (apenas números)
 */
    private normalizarNumeroTelefone(numero: string): string {
        if (!numero) return '';

        // Remove todos os caracteres não numéricos
        const apenasNumeros = numero.replace(/\D/g, '');

        // Verifica se tem DDD (2 dígitos) + número (8 ou 9 dígitos)
        if (apenasNumeros.length >= 10 && apenasNumeros.length <= 11) {
            return apenasNumeros;
        }

        throw new BadRequestException(
            `Número de telefone inválido. Formato esperado: DDD + número (10 ou 11 dígitos). Recebido: ${numero}`
        );
    }

    private formatarChavePix(chave: string, tipo: string): string {
        switch (tipo.toLowerCase()) {
            case 'telefone':
                return this.normalizarNumeroTelefone(chave);

            case 'email':
                // Validação básica de email (pode ser removida se quiser desabilitar)
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(chave)) {
                    throw new BadRequestException('Formato de email inválido');
                }
                return chave.toLowerCase();

            case 'cpf':
            case 'cnpj':
                return chave.replace(/\D/g, '');

            case 'aleatoria':
                // Chave aleatória do tipo EVP
                if (!chave.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
                    throw new BadRequestException('Chave aleatória deve ser um UUID válido');
                }
                return chave;

            default:
                return chave;
        }
    }

    /**
     * Verifica se uma chave PIX é válida (COM VALIDAÇÃO DESABILITÁVEL)
     */
    private validarChavePix(chave: string, tipo: string, validar: boolean = false): boolean {
        // Se validação estiver desabilitada, retorna true sempre
        if (!validar) {
            return true;
        }

        try {
            const chaveFormatada = this.formatarChavePix(chave, tipo);
            return !!chaveFormatada;
        } catch {
            return false;
        }
    }

    /**
     * Gera o payload PIX manualmente (sem biblioteca externa)
     */
    private gerarPayloadPixManual(dados: {
        chaveDestino: string;
        nomeDestinatario: string;
        valor: number;
        descricao: string;
        txid: string;
        cidadeRemetente: string;
    }): string {
        try {
            // Formatar valores
            const valorFormatado = dados.valor.toFixed(2);
            const nomeLimitado = dados.nomeDestinatario.substring(0, 25);
            const descricaoLimitada = dados.descricao.substring(0, 72);

            // Montar payload PIX no formato BR Code
            const payload = [
                '000201', // Payload Format Indicator
                '26580014br.gov.bcb.pix', // PIX Merchant Account Information
                `01${dados.chaveDestino.length.toString().padStart(2, '0')}${dados.chaveDestino}`,
                '52040000', // Merchant Category Code
                '5303986', // Transaction Currency (986 = BRL)
                `54${valorFormatado.length.toString().padStart(2, '0')}${valorFormatado}`,
                '5802BR', // Country Code
                `59${nomeLimitado.length.toString().padStart(2, '0')}${nomeLimitado}`,
                `60${dados.cidadeRemetente.length.toString().padStart(2, '0')}${dados.cidadeRemetente}`,
                `62${(5 + descricaoLimitada.length).toString().padStart(2, '0')}05${descricaoLimitada.length.toString().padStart(2, '0')}${descricaoLimitada}`,
                '6304' // CRC16 placeholder
            ].join('');

            // Calcular CRC16
            const crc = this.calcularCRC16(payload);
            return `${payload}${crc.toString(16).toUpperCase().padStart(4, '0')}`;
        } catch (error) {
            throw new BadRequestException(`Erro ao gerar payload PIX: ${error.message}`);
        }
    }

    /**
     * Calcula CRC16 para o payload PIX
     */
    private calcularCRC16(payload: string): number {
        let crc = 0xFFFF;
        for (let i = 0; i < payload.length; i++) {
            crc ^= payload.charCodeAt(i) << 8;
            for (let j = 0; j < 8; j++) {
                crc = (crc & 0x8000) ? (crc << 1) ^ 0x1021 : crc << 1;
            }
        }
        return crc & 0xFFFF;
    }

    /**
     * Determina o destinatário baseado no tipo de lançamento
     */
    private async determinarDestinatario(lancamento: any, empresaId: string): Promise<{
        chaveDestino: string;
        nomeDestinatario: string;
        tipoDestinatario: string;
    }> {
        let chaveDestino = '';
        let nomeDestinatario = '';
        let tipoDestinatario = '';

        // Caso 1: Comissão para corretor
        if (lancamento.categoria === 'COMISSAO' && lancamento.comissionado) {
            const usuario = await this.usuarioService.buscarPorChavePix(
                lancamento.comissionado.toString(),
                empresaId
            );

            if (usuario?.chavePix?.chave) {
                chaveDestino = usuario.chavePix.chave;
                nomeDestinatario = usuario.nome;
                tipoDestinatario = 'Corretor';
            }
        }
        // Caso 2: Repasse para proprietário (cliente)
        else if (lancamento.categoria === 'REPASSE' && lancamento.cliente) {
            const cliente = await this.clienteService.buscarPorChavePix(
                lancamento.cliente.toString(),
                empresaId
            );

            if (cliente?.chavePix?.chave) {
                chaveDestino = cliente.chavePix.chave;
                nomeDestinatario = cliente.nome;
                tipoDestinatario = 'Proprietário';
            }
        }
        // Caso 3: Receita para a imobiliária (empresa) - AGORA BUSCA REAL
        else if (lancamento.tipo === 'RECEITA') {
            const empresa = await this.empresaService.findOne(empresaId);

            if (empresa?.chavePix?.chave) {
                chaveDestino = empresa.chavePix.chave;
                nomeDestinatario = empresa.nome;
                tipoDestinatario = 'Empresa';
            } else {
                throw new BadRequestException('Empresa não possui chave PIX cadastrada');
            }
        }
        // Caso 4: Despesa (não gera PIX)
        else {
            throw new BadRequestException('Este tipo de lançamento não gera QR Code PIX');
        }

        return { chaveDestino, nomeDestinatario, tipoDestinatario };
    }

    /**
     * Gera QR Code em base64
     */
    private async gerarQrCodeBase64(payload: string): Promise<string> {
        try {
            return await QRCode.toDataURL(payload, {
                errorCorrectionLevel: 'H',
                margin: 2,
                width: 300,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            });
        } catch (error) {
            throw new BadRequestException(`Erro ao gerar QR Code: ${error.message}`);
        }
    }

    /**
     * Calcula data de expiração (dias a partir de hoje)
     */
    private calcularDataExpiracao(dias: number): string {
        const data = new Date();
        data.setDate(data.getDate() + dias);
        return data.toISOString().split('T')[0];
    }

    /**
     * Busca transação PIX por ID
     */
    async buscarTransacaoPorId(transacaoId: string, empresaId: string): Promise<any> {
        const transacao = await this.transacaoPixModel.findOne({
            _id: new Types.ObjectId(transacaoId),
            empresa: new Types.ObjectId(empresaId)
        }).populate('lancamentoFinanceiro', 'descricao valor status').exec();

        if (!transacao) {
            throw new NotFoundException('Transação PIX não encontrada');
        }

        return transacao.toObject();
    }

    /**
     * Lista todas as transações PIX da empresa
     */
    async listarTransacoesPorEmpresa(empresaId: string, filtros?: any): Promise<any[]> {
        const query: any = { empresa: new Types.ObjectId(empresaId) };

        // Aplicar filtros se fornecidos
        if (filtros?.status) {
            query.status = filtros.status;
        }

        if (filtros?.dataInicio || filtros?.dataFim) {
            query.createdAt = {};
            if (filtros.dataInicio) {
                query.createdAt.$gte = new Date(filtros.dataInicio);
            }
            if (filtros.dataFim) {
                query.createdAt.$lte = new Date(filtros.dataFim);
            }
        }

        const transacoes = await this.transacaoPixModel.find(query)
            .sort({ createdAt: -1 })
            .populate('lancamentoFinanceiro', 'descricao valor status categoria')
            .populate('usuarioSolicitante', 'nome email')
            .limit(filtros?.limit || 50)
            .exec();

        return transacoes.map(t => t.toObject());
    }

    /**
     * Atualiza status da transação PIX
     */
    async atualizarStatusTransacao(
        transacaoId: string,
        empresaId: string,
        status: StatusTransacaoPix,
        dadosAdicionais?: any
    ): Promise<any> {
        const updateData: any = { status };

        if (status === StatusTransacaoPix.PAGO && !dadosAdicionais?.dataPagamento) {
            updateData.dataPagamento = new Date().toISOString().split('T')[0];
            updateData.transacaoId = dadosAdicionais?.transacaoId;
        }

        if (dadosAdicionais?.observacoes) {
            updateData.observacoes = dadosAdicionais.observacoes;
        }

        const transacaoAtualizada = await this.transacaoPixModel.findOneAndUpdate(
            {
                _id: new Types.ObjectId(transacaoId),
                empresa: new Types.ObjectId(empresaId)
            },
            { $set: updateData },
            { new: true }
        ).exec();

        // CORREÇÃO: Verificar se é null antes de usar
        if (!transacaoAtualizada) {
            throw new NotFoundException('Transação PIX não encontrada');
        }

        // Se foi pago, atualizar também o lançamento financeiro
        if (status === StatusTransacaoPix.PAGO) {
            await this.financeiroService.registrarPagamento(
                transacaoAtualizada.lancamentoFinanceiro.toString(),
                empresaId,
                {
                    valorPago: transacaoAtualizada.valor,
                    dataPagamento: transacaoAtualizada.dataPagamento,
                    observacoes: `Pago via PIX - Transação: ${transacaoId}`
                }
            );
        }

        return transacaoAtualizada.toObject();
    }

    /**
     * Cancela uma transação PIX
     */
    async cancelarTransacao(transacaoId: string, empresaId: string, motivo?: string): Promise<any> {
        const transacao = await this.buscarTransacaoPorId(transacaoId, empresaId);

        if (transacao.status === StatusTransacaoPix.PAGO) {
            throw new BadRequestException('Não é possível cancelar uma transação já paga');
        }

        if (transacao.status === StatusTransacaoPix.CANCELADO) {
            throw new BadRequestException('Transação já está cancelada');
        }

        return this.atualizarStatusTransacao(
            transacaoId,
            empresaId,
            StatusTransacaoPix.CANCELADO,
            { observacoes: motivo || 'Cancelado pelo usuário' }
        );
    }

    /**
     * Reenvia QR Code (gera novo com mesma transação)
     */
    async reenviarQrCode(transacaoId: string, empresaId: string): Promise<any> {
        const transacao = await this.buscarTransacaoPorId(transacaoId, empresaId);

        if (transacao.status === StatusTransacaoPix.PAGO) {
            throw new BadRequestException('Não é possível reenviar QR Code de transação já paga');
        }

        // Gerar novo QR Code base64
        const novoQrCodeBase64 = await this.gerarQrCodeBase64(transacao.payloadPix);

        const transacaoAtualizada = await this.transacaoPixModel.findOneAndUpdate(
            {
                _id: new Types.ObjectId(transacaoId),
                empresa: new Types.ObjectId(empresaId)
            },
            {
                $set: {
                    qrCodeBase64: novoQrCodeBase64,
                    dataExpiracao: this.calcularDataExpiracao(3),
                    status: StatusTransacaoPix.GERADO
                }
            },
            { new: true }
        ).exec();

        // CORREÇÃO: Verificar se é null antes de usar
        if (!transacaoAtualizada) {
            throw new NotFoundException('Transação PIX não encontrada após atualização');
        }

        return transacaoAtualizada.toObject();
    }

    /**
     * Verifica transações expiradas e atualiza status
     */
    async verificarTransacoesExpiradas(empresaId: string): Promise<number> {
        const hoje = new Date().toISOString().split('T')[0];

        const resultado = await this.transacaoPixModel.updateMany(
            {
                empresa: new Types.ObjectId(empresaId),
                status: { $in: [StatusTransacaoPix.PENDENTE, StatusTransacaoPix.GERADO] },
                dataExpiracao: { $lt: hoje }
            },
            {
                $set: { status: StatusTransacaoPix.EXPIRADO }
            }
        ).exec();

        return resultado.modifiedCount;
    }

    /**
     * Obtém estatísticas de transações PIX
     */
    async obterEstatisticas(empresaId: string): Promise<any> {
        const pipeline = [
            {
                $match: {
                    empresa: new Types.ObjectId(empresaId),
                    createdAt: {
                        $gte: new Date(new Date().setMonth(new Date().getMonth() - 1))
                    }
                }
            },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    totalValor: { $sum: '$valor' }
                }
            }
        ];

        const estatisticas = await this.transacaoPixModel.aggregate(pipeline).exec();

        const resultado = {
            totalTransacoes: 0,
            totalPago: 0,
            totalPendente: 0,
            totalExpirado: 0,
            totalCancelado: 0,
            valorTotalPago: 0
        };

        estatisticas.forEach((stat: any) => {
            resultado.totalTransacoes += stat.count;

            if (stat._id === StatusTransacaoPix.PAGO) {
                resultado.totalPago = stat.count;
                resultado.valorTotalPago = stat.totalValor;
            } else if (stat._id === StatusTransacaoPix.PENDENTE || stat._id === StatusTransacaoPix.GERADO) {
                resultado.totalPendente += stat.count;
            } else if (stat._id === StatusTransacaoPix.EXPIRADO) {
                resultado.totalExpirado = stat.count;
            } else if (stat._id === StatusTransacaoPix.CANCELADO) {
                resultado.totalCancelado = stat.count;
            }
        });

        return resultado;
    }
}