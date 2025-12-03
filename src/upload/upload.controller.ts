// src/upload/upload.controller.ts
import { Controller, Post, UseInterceptors, UploadedFile, UseGuards, HttpException, HttpStatus, Get, Param, Res } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { PerfisEnum } from 'src/usuario/schemas/usuario.schema';
import { type Response } from 'express';
import { UploadService } from './upload.service';
import { resolve } from 'path';

@ApiTags('Arquivos e Uploads')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('uploads')
export class UploadController {
    constructor(private readonly uploadService: UploadService) { }

    // 1. Rota de Upload
    @Post('foto-imovel')
    // ⭐️ Restringe o acesso apenas a ADM_GERAL e CORRETOR
    @Roles(PerfisEnum.ADM_GERAL, PerfisEnum.CORRETOR)
    // ⭐️ Usa o FileInterceptor para processar o campo 'file' do form-data
    @UseInterceptors(FileInterceptor('file'))
    @ApiOperation({ summary: 'Faz upload de uma foto, salvando-a localmente.' })
    @ApiConsumes('multipart/form-data') // Necessário para o Swagger reconhecer o tipo de dado
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary', // Indica que este campo é um arquivo
                },
            },
        },
    })
    uploadFile(@UploadedFile() file: Express.Multer.File) {
        if (!file) {
            throw new HttpException('Nenhum arquivo enviado.', HttpStatus.BAD_REQUEST);
        }

        // ⭐️ O Multer já salvou o arquivo. Retornamos o path para registro no DB (Imovel)
        return {
            message: 'Upload realizado com sucesso!',
            filename: file.filename, // Nome único gerado pelo Multer
            path: file.path,        // Caminho completo
            mimetype: file.mimetype,
            size: file.size,
        };
    }

    // 2. Rota para servir o arquivo
    // Esta rota é necessária para testar o acesso à imagem salva
    @Get(':filename')
    @ApiOperation({ summary: 'Busca um arquivo salvo pelo nome.' })
    // ⭐️ Não requer Roles, mas exige estar logado para ver arquivos
    getFile(@Param('filename') filename: string, @Res() res: Response) {
        const filePath = resolve(__dirname, '..', '..', 'uploads', filename);
        return res.sendFile(filePath);
    }
}