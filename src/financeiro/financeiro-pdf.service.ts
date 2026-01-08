import { Injectable } from '@nestjs/common';
// Importação híbrida para evitar erro de assinatura de constructo ts(2351)
const PDFDocument = require('pdfkit');
import * as axios from 'axios';

@Injectable()
export class FinanceiroPdfService {
    /**
     * Gera um buffer de PDF contendo o recibo de pagamento.
     * @param lancamento Dados do lançamento financeiro (já com populate de cliente)
     * @param empresa Dados da empresa logada (nome, logo, etc)
     */
    async gerarRecibo(lancamento: any, empresa: any): Promise<Buffer> {
        return new Promise(async (resolve, reject) => {
            try {
                const doc = new PDFDocument({ size: 'A4', margin: 50 });
                const chunks: Buffer[] = [];

                // Captura os dados do PDF em chunks
                doc.on('data', (chunk: Buffer) => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));
                doc.on('error', (err) => reject(err));

                // --- 1. CABEÇALHO COM LOGO ---
                if (empresa?.logo) {
                    try {
                        // Busca a imagem do Cloudinary/URL e converte para buffer
                        const response = await axios.default.get(empresa.logo, {
                            responseType: 'arraybuffer',
                        });
                        doc.image(response.data, 50, 45, { width: 80 });
                    } catch (error) {
                        console.error('Não foi possível carregar o logo da empresa no PDF');
                    }
                }

                // Dados da Imobiliária (Alinhados à direita)
                doc.fontSize(12).text(empresa.nome || 'Imobiliária Sistema', 200, 50, { align: 'right' });
                doc.fontSize(8).text(`CNPJ: ${empresa.cnpj || '00.000.000/0000-00'}`, 200, 65, { align: 'right' });
                doc.text(empresa.endereco || '', 200, 75, { align: 'right' });

                doc.moveDown(3);
                doc.lineWidth(1);
                doc.moveTo(50, 100).lineTo(550, 100).stroke(); // Linha divisória

                // --- 2. TÍTULO ---
                doc.moveDown(2);
                doc.fontSize(22).text('RECIBO DE PAGAMENTO', { align: 'center', charSpacing: 2 });
                doc.moveDown();
                doc.fontSize(10).text(`Nº Lançamento: ${lancamento._id}`, { align: 'right' });
                doc.moveDown();

                // --- 3. CORPO DO RECIBO ---
                const valorExtenso = `R$ ${lancamento.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
                const dataDoc = new Date(lancamento.dataPagamento || lancamento.dataVencimento).toLocaleDateString('pt-BR');

                // Moldura de destaque
                doc.rect(50, 220, 500, 160).fillAndStroke('#f9f9f9', '#333');
                doc.fillColor('#000');

                doc.fontSize(12).text('Recebemos de:', 70, 240);
                doc.fontSize(14).font('Helvetica-Bold').text(lancamento.cliente?.nome || 'Cliente não identificado', 160, 240);

                doc.fontSize(12).font('Helvetica').text('A quantia de:', 70, 270);
                doc.fontSize(14).font('Helvetica-Bold').text(valorExtenso, 160, 270);

                doc.fontSize(12).font('Helvetica').text('Referente a:', 70, 300);
                doc.fontSize(11).text(lancamento.descricao || 'Pagamento de aluguel/taxas', 160, 300, { width: 350 });

                doc.fontSize(12).text('Data do Pagamento:', 70, 340);
                doc.fontSize(12).text(dataDoc, 185, 340);

                // --- 4. RODAPÉ / ASSINATURA ---
                doc.moveDown(6);
                const yAssinatura = doc.y;
                doc.text('________________________________________________', { align: 'center' });
                doc.fontSize(10).text('Assinatura Responsável', { align: 'center' });
                doc.fontSize(8).text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, { align: 'center' });

                doc.end();
            } catch (error) {
                reject(error);
            }
        });
    }
}