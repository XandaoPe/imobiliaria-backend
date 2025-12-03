// src/upload/upload.module.ts
import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import * as multer from 'multer';
import { resolve } from 'path';
import * as fs from 'fs';

// ⭐️ DEFINIR O CAMINHO ABSOLUTO DA PASTA UPLOADS
const UPLOADS_DIR = resolve(__dirname, '..', '..', 'uploads');

// ⭐️ Garantir que o diretório de uploads existe
if (!fs.existsSync(UPLOADS_DIR)) {
    console.log(`Criando diretório de uploads: ${UPLOADS_DIR}`);
    // Cria de forma síncrona (mkdirSync) e recursiva (recursive: true)
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Configuração do storage local
const storage = multer.diskStorage({
    // 1. Onde o arquivo será salvo
    destination: (req, file, cb) => {
        // ⭐️ Usar a constante definida e verificada acima
        cb(null, UPLOADS_DIR);
    },
    // 2. Como o arquivo será nomeado (sem alterações)
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `${file.fieldname}-${uniqueSuffix}-${file.originalname}`);
    },
});

@Module({
    imports: [
        // ⭐️ Configura o Multer em escopo de módulo
        MulterModule.register({
            storage: storage,
            // Opcional: Filtro de tipos de arquivo (Ex: apenas imagens)
            fileFilter: (req, file, cb) => {
                if (file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
                    // Aceita o arquivo
                    cb(null, true);
                } else {
                    // Rejeita o arquivo
                    cb(new Error('Apenas arquivos de imagem (jpg, jpeg, png, gif) são permitidos!'), false);
                }
            },
            // Limite do tamanho do arquivo (Ex: 5MB)
            limits: {
                fileSize: 1024 * 1024 * 5,
            },
        }),
    ],
    controllers: [UploadController],
    providers: [UploadService],
    exports: [MulterModule] // Exportar para ser usado em outros módulos se necessário
})
export class UploadModule { }