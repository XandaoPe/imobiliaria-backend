import { Injectable, BadRequestException } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import * as toStream from 'buffer-to-stream';

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
        if (!file) {
            throw new BadRequestException('Nenhum arquivo enviado.');
        }

        return new Promise((resolve, reject) => {
            const upload = cloudinary.uploader.upload_stream(
                {
                    folder: 'imoveis', // As fotos serão organizadas nesta pasta no Cloudinary
                    resource_type: 'auto',
                },
                (error, result) => {
                    if (error) return reject(error);
                    if (!result) {
                        return reject(new Error('Falha ao obter resposta do Cloudinary.'));
                    }
                    resolve(result.secure_url);
                },
            );


            // Converte o buffer do arquivo em stream e envia para o Cloudinary
            toStream(file.buffer).pipe(upload);
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