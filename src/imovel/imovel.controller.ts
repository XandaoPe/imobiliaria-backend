import {
  Controller, Post, Get, Put, Delete, Body, Param, UseGuards, Req,
  UseInterceptors, UploadedFile, HttpException, HttpStatus,
  Query
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

import { ImovelService } from './imovel.service';
import { Imovel } from './schemas/imovel.schema';
import { CreateImovelDto } from './dto/create-imovel.dto';
import { UpdateImovelDto } from './dto/update-imovel.dto';

import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { PerfisEnum } from 'src/usuario/schemas/usuario.schema';
import { UsuarioPayload } from 'src/auth/interfaces/usuario-payload.interface';

export interface RequestWithUser extends Request {
  user: UsuarioPayload;
}

const ROLES_ACCESS = [PerfisEnum.CORRETOR, PerfisEnum.GERENTE, PerfisEnum.ADM_GERAL];

@ApiTags('Imóveis')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('imoveis')
export class ImovelController {
  constructor(private readonly imovelService: ImovelService) { }

  @Post()
  @Roles(...ROLES_ACCESS)
  @ApiOperation({ summary: 'Cria um novo imóvel (Multitenancy).' })
  create(@Body() createImovelDto: CreateImovelDto, @Req() req: RequestWithUser): Promise<Imovel> {
    return this.imovelService.create(createImovelDto, req.user.empresa);
  }

  @Get()
  @Roles(...ROLES_ACCESS)
  @ApiOperation({ summary: 'Lista todos os imóveis da empresa (com busca opcional e filtro de status).' })
  @ApiQuery({ name: 'search', required: false, description: 'Termo de busca por imovel, endereço...' })
  @ApiQuery({ name: 'status', required: false, description: 'Termo de busca por disponível e indisponível' })
     // ⭐️ ATUALIZADO: Adicionar o parâmetro de status
  findAll(
    @Req() req: RequestWithUser,
    @Query('search') search?: string,
    @Query('status') status?: string, // <-- NOVO: status será 'DISPONIVEL' ou 'INDISPONIVEL'
  ): Promise<Imovel[]> {
    // ⭐️ Passa o status para o Service
    return this.imovelService.findAll(req.user.empresa, search, status);
  }

  @Get(':id')
  @Roles(...ROLES_ACCESS)
  @ApiOperation({ summary: 'Busca um imóvel por ID (Multitenancy).' })
  findOne(@Param('id') id: string, @Req() req: RequestWithUser): Promise<Imovel> {
    return this.imovelService.findOne(id, req.user.empresa);
  }

  @Put(':id')
  @Roles(...ROLES_ACCESS)
  @ApiOperation({ summary: 'Atualiza um imóvel por ID (Multitenancy).' })
  update(
    @Param('id') id: string,
    @Body() updateImovelDto: UpdateImovelDto,
    @Req() req: RequestWithUser,
  ): Promise<Imovel> {
    return this.imovelService.update(id, updateImovelDto, req.user.empresa);
  }

  @Delete(':id')
  @Roles(PerfisEnum.GERENTE, PerfisEnum.ADM_GERAL)
  @ApiOperation({ summary: 'Remove um imóvel por ID (Apenas Gerente/ADM).' })
  remove(@Param('id') id: string, @Req() req: RequestWithUser): Promise<{ message: string }> {
    return this.imovelService.remove(id, req.user.empresa);
  }


  // ====================================================================
  // ROTA DE UPLOAD DE FOTO
  // ====================================================================
  @Post(':id/upload-foto')
  @Roles(...ROLES_ACCESS)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Faz upload de uma foto e associa ao Imóvel (Multitenancy).' })
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
  async uploadPhoto(
    @Param('id') imovelId: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: RequestWithUser,
  ): Promise<Imovel> {
    if (!file) {
      throw new HttpException('Nenhum arquivo de foto enviado.', HttpStatus.BAD_REQUEST);
    }

    const empresaId = req.user.empresa;
    const filename = file.filename;

    return this.imovelService.addPhoto(imovelId, empresaId, filename);
  }

  // ====================================================================
  // ROTA DE REMOÇÃO DE FOTO
  // ====================================================================
  @Delete(':id/foto/:filename')
  @Roles(PerfisEnum.GERENTE, PerfisEnum.ADM_GERAL)
  @ApiOperation({ summary: 'Remove uma foto do array do Imóvel.' })
  async deletePhoto(
    @Param('id') imovelId: string,
    @Param('filename') filename: string,
    @Req() req: RequestWithUser,
  ): Promise<Imovel> {
    const empresaId = req.user.empresa;

    return this.imovelService.removePhoto(imovelId, empresaId, filename);
  }
}