// src/financeiro/financeiro-pdf.service.ts
import { Injectable } from '@nestjs/common';
const PDFDocument = require('pdfkit');
import * as axios from 'axios';
// @ts-ignore
import extenso from 'extenso';
import * as QRCode from 'qrcode';

@Injectable()
export class FinanceiroPdfService {

    async gerarRecibo(lancamento: any, empresa: any): Promise<Buffer> {
        return new Promise(async (resolve, reject) => {
            try {
                // Margem de 40 em todos os lados
                const doc = new PDFDocument({ size: 'A4', margin: 40 });
                const chunks: Buffer[] = [];

                doc.on('data', (chunk: Buffer) => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));
                doc.on('error', (err) => reject(err));

                // --- MARCA D'ÁGUA ---
                if (empresa?.logo) {
                    try {
                        const responseLogo = await axios.default.get(empresa.logo, { responseType: 'arraybuffer' });
                        doc.save().opacity(0.04).image(responseLogo.data, 145, 250, { width: 300 }).restore();
                    } catch (e) { console.error('Erro marca dágua'); }
                }

                // --- 1. CABEÇALHO ---
                if (empresa?.logo) {
                    try {
                        const response = await axios.default.get(empresa.logo, { responseType: 'arraybuffer' });
                        // Logo aumentado para 65 de altura
                        doc.image(response.data, 40, 35, { height: 65 });
                    } catch (e) { console.error('Erro logo'); }
                }

                // Informações da empresa alinhadas à direita (começando em X:200 para garantir espaço)
                doc.fillColor('#000000')
                    .fontSize(11)
                    .font('Helvetica-Bold')
                    .text(empresa.nome || 'Imobiliária', 200, 45, { align: 'right' });

                doc.fontSize(8)
                    .font('Helvetica')
                    .text(`CNPJ: ${empresa.cnpj || ''}`, 200, 57, { align: 'right' });

                // Linha divisória
                doc.moveTo(40, 110).lineTo(555, 110).lineWidth(0.5).strokeColor('#cccccc').stroke();

                // --- 2. TÍTULO E VALOR (CORRIGIDO PARA CENTRALIZAÇÃO REAL) ---
                doc.y = 150;
                // Removida a coordenada X fixa para o alinhamento 'center' funcionar na página toda
                doc.fontSize(24)
                    .font('Helvetica-Bold')
                    .fillColor('#000000')
                    .text('RECIBO', { align: 'center' });

                const valorFormatado = lancamento.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                doc.moveDown(0.5);
                doc.fontSize(20)
                    .text(valorFormatado, { align: 'center' });

                // --- 3. CORPO DO TEXTO ---
                doc.y = 260;
                const valorExtenso = extenso(lancamento.valor, { mode: 'currency', currency: { type: 'BRL' } });
                const extensoFinal = valorExtenso.charAt(0).toUpperCase() + valorExtenso.slice(1);
                const dataDoc = new Date(lancamento.dataPagamento || lancamento.dataVencimento).toLocaleDateString('pt-BR');

                doc.font('Helvetica').fontSize(12).fillColor('#333333').lineGap(8);
                const textoRecibo = `Recebemos de ${lancamento.cliente?.nome || '____________________'}, a quantia de ${valorFormatado} (${extensoFinal}), referente a ${lancamento.descricao || 'pagamentos diversos'}.`;

                // Alinhamento justificado ocupando a largura útil da página
                doc.text(textoRecibo, 40, doc.y, { align: 'justify', width: 515 });

                doc.moveDown(2);
                doc.fillColor('#000000').text(`Data: ${dataDoc}`, { align: 'left' });

                // --- 4. ASSINATURA ---
                const linhaAssinaturaY = 580;

                if (empresa?.assinatura_url) {
                    try {
                        const respAssin = await axios.default.get(empresa.assinatura_url, { responseType: 'arraybuffer' });
                        // Centralizado sobre a linha
                        doc.image(respAssin.data, 222, linhaAssinaturaY - 65, { width: 150 });
                    } catch (e) { console.error('Erro assinatura'); }
                }

                doc.moveTo(170, linhaAssinaturaY).lineTo(425, linhaAssinaturaY).lineWidth(0.5).strokeColor('#000000').stroke();

                // Nome da empresa centralizado abaixo da linha
                doc.fontSize(10)
                    .font('Helvetica-Bold')
                    .text(empresa.nome, 40, linhaAssinaturaY + 8, { align: 'center' });

                doc.fontSize(8)
                    .font('Helvetica')
                    .fillColor('#4444aa')
                    .text('Assinado Eletronicamente', 40, linhaAssinaturaY + 22, { align: 'center' });

                // --- 5. QR CODE E RODAPÉ ---
                const rodapeY = 720;

                try {
                    // const urlValidacao = `https://imobiliaria-frontend-six.vercel.app/financeiro/validar/${lancamento._id}`;
                    const urlValidacao = `http://localhost:3000/financeiro/validar/${lancamento._id}`;
                    const qrCodeBase64 = await QRCode.toDataURL(urlValidacao);
                    const qrImage = Buffer.from(qrCodeBase64.split(',')[1], 'base64');

                    doc.image(qrImage, 40, rodapeY, { width: 45 });
                    doc.fontSize(7).fillColor('#000000').text('Aponte a câmera para validar este documento', 40, rodapeY + 50);
                } catch (e) { console.error('Erro QR Code'); }

                doc.fontSize(7).fillColor('grey').text(`ID: ${lancamento._id} - Gerado em ${new Date().toLocaleString()}`, 40, 790, { align: 'center' });

                doc.end();
            } catch (error) {
                reject(error);
            }
        });
    }
}