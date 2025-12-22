// src/upload/upload.module.ts
import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import * as multer from 'multer';

@Module({
    imports: [
        MulterModule.register({
            // ⭐️ IMPORTANTE: Usamos memoryStorage em vez de diskStorage
            // Isso evita que o Render tente gravar arquivos no disco que será apagado
            storage: multer.memoryStorage(),

            fileFilter: (req, file, cb) => {
                if (file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
                    cb(null, true);
                } else {
                    cb(new Error('Apenas arquivos de imagem são permitidos!'), false);
                }
            },
            limits: {
                fileSize: 1024 * 1024 * 5, // 5MB
            },
        }),
    ],
    controllers: [UploadController],
    providers: [UploadService],
    exports: [UploadService] // Exportamos o serviço para outros módulos usarem
})
export class UploadModule { }