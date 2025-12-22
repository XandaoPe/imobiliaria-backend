import { Controller, Post, UseInterceptors, UploadedFile, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { PerfisEnum } from 'src/usuario/schemas/usuario.schema';
import { UploadService } from './upload.service';

@ApiTags('Arquivos e Uploads')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('uploads')
export class UploadController {
    constructor(private readonly uploadService: UploadService) { }

    @Post('foto-imovel')
    @Roles(PerfisEnum.ADM_GERAL, PerfisEnum.CORRETOR)
    @UseInterceptors(FileInterceptor('file')) // O NestJS manterá o arquivo em memória (buffer)
    @ApiOperation({ summary: 'Faz upload de uma foto diretamente para o Cloudinary.' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                },
            },
        },
    })
    async uploadFile(@UploadedFile() file: Express.Multer.File) {
        if (!file) {
            throw new HttpException('Nenhum arquivo enviado.', HttpStatus.BAD_REQUEST);
        }

        try {
            // ⭐️ Chamar o serviço que envia para a nuvem
            const url = await this.uploadService.uploadImage(file);

            return {
                message: 'Upload realizado com sucesso no Cloudinary!',
                url: url, // ⭐️ Esta URL completa é o que o seu Frontend deve salvar no banco
                mimetype: file.mimetype,
                size: file.size,
            };
        } catch (error) {
            throw new HttpException(
                'Erro ao processar upload para a nuvem: ' + error.message,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }
}