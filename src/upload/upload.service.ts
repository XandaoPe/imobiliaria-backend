import { Injectable, BadRequestException } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class UploadService {
    constructor() {
        // Configuração do Cloudinary usando variáveis de ambiente
        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
        });
    }

    async uploadImage(file: Express.Multer.File): Promise<string> {
        console.log('--- INICIANDO UPLOAD PARA CLOUDINARY ---');
        console.log('Arquivo recebido:', file?.originalname);
        console.log('Tamanho do buffer:', file?.buffer?.length, 'bytes');
        console.log('Cloud Name:', process.env.CLOUDINARY_NAME);

        if (!process.env.CLOUDINARY_NAME) {
            throw new Error("Erro Crítico: Variáveis do Cloudinary não carregadas no .env");
        }

        if (!file || !file.buffer) {
            console.error('ERRO: Arquivo ou Buffer ausente!');
            throw new BadRequestException('Nenhum arquivo enviado.');
        }

        return new Promise((resolve, reject) => {
            const upload = cloudinary.uploader.upload_stream(
                {
                    folder: 'imoveis',
                    resource_type: 'auto',
                },
                (error, result) => {
                    if (error) {
                        console.error('ERRO DO CLOUDINARY NO STREAM:', error);
                        return reject(error);
                    }

                    if (!result) {
                        console.error('ERRO: Resultado do Cloudinary veio vazio.');
                        return reject(new Error('Falha ao obter resposta do Cloudinary.'));
                    }

                    console.log('SUCESSO NO CLOUDINARY! URL:', result.secure_url);
                    resolve(result.secure_url);
                },
            );

            // O erro 500 costuma acontecer aqui se o buffer estiver corrompido ou o stream falhar
            try {
                const stream = new Readable();
                stream.push(file.buffer);
                stream.push(null); // Indica o fim do arquivo
                stream.pipe(upload);
            } catch (streamError) {
                console.error('ERRO AO CRIAR STREAM:', streamError);
                reject(streamError);
            }
        });
    }

    async deleteImage(url: string): Promise<any> {
        // Extrai o public_id da URL do Cloudinary
        // Exemplo: https://res.cloudinary.com/cloudname/image/upload/v1/imoveis/nome_da_foto.jpg
        // O public_id seria "imoveis/nome_da_foto"
        try {
            const parts = url.split('/');
            const folderAndFile = parts.slice(parts.indexOf('imoveis')).join('/'); // "imoveis/foto"
            const publicId = folderAndFile.split('.')[0]; // Remove a extensão (.jpg)

            return new Promise((resolve, reject) => {
                cloudinary.uploader.destroy(publicId, (error, result) => {
                    if (error) return reject(error);
                    resolve(result);
                });
            });
        } catch (err) {
            console.error('Erro ao processar URL para exclusão:', err);
        }
    }
}