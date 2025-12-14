import { Controller, Post, UseInterceptors, UploadedFile, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { PerfisEnum } from 'src/usuario/schemas/usuario.schema';
import { UploadService } from './upload.service';
// ⭐️ As importações desnecessárias (Get, Param, Res, etc.) foram removidas

@ApiTags('Arquivos e Uploads')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('uploads')
export class UploadController {
    constructor(private readonly uploadService: UploadService) { }

    // 1. Rota de Upload (POST)
    @Post('foto-imovel')
    @Roles(PerfisEnum.ADM_GERAL, PerfisEnum.CORRETOR)
    @UseInterceptors(FileInterceptor('file'))
    @ApiOperation({ summary: 'Faz upload de uma foto, salvando-a localmente.' })
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
    uploadFile(@UploadedFile() file: Express.Multer.File) {
        if (!file) {
            throw new HttpException('Nenhum arquivo enviado.', HttpStatus.BAD_REQUEST);
        }

        // Retornamos o filename, que será salvo no DB do Imóvel.
        return {
            message: 'Upload realizado com sucesso!',
            filename: file.filename,
            // Sugestão: Acessível em http://localhost:5000/uploads/imoveis/{{filename}}
            path: `uploads/imoveis/${file.filename}`,
            mimetype: file.mimetype,
            size: file.size,
        };
    }

    // ⭐️ A ROTA de GET(':filename') FOI REMOVIDA.
    // O NestJS agora serve o arquivo estaticamente via ServeStaticModule.
}