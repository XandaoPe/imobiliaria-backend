import {
  Controller, Get, Post, Body, Param, Delete, Put,
  HttpCode, HttpStatus, UseGuards, Query, UseInterceptors, UploadedFile,
  Patch
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { EmpresaService } from './empresa.service';
import { CreateEmpresaDto } from './dto/create-empresa.dto';
import { ChavePixEmpresaDto, UpdateEmpresaDto } from './dto/update-empresa.dto';
import { Empresa } from './schemas/empresa.schema';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiConsumes } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { PerfisEnum } from 'src/usuario/schemas/usuario.schema';

@ApiTags('Empresas')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('empresas')
export class EmpresaController {
  constructor(private readonly empresaService: EmpresaService) { }

  @Post()
  @Roles(PerfisEnum.ADM_GERAL)
  @ApiOperation({ summary: 'Cria uma nova empresa.' })
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createEmpresaDto: CreateEmpresaDto): Promise<Empresa> {
    return this.empresaService.create(createEmpresaDto);
  }

  @Get()
  @Roles(PerfisEnum.ADM_GERAL, PerfisEnum.GERENTE)
  @ApiOperation({ summary: 'Lista empresas com filtros.' })
  findAll(
    @Query('search') search?: string,
    @Query('ativa') ativa?: string,
    @Query('isAdmGeral') isAdmGeral?: string,
  ): Promise<Empresa[]> {
    return this.empresaService.findAll(search, ativa, isAdmGeral);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Busca empresa específica por ID.' })
  findOne(@Param('id') id: string): Promise<Empresa> {
    return this.empresaService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualiza dados da empresa.' })
  update(@Param('id') id: string, @Body() updateEmpresaDto: UpdateEmpresaDto): Promise<Empresa> {
    return this.empresaService.update(id, updateEmpresaDto);
  }

  @Delete(':id')
  @Roles(PerfisEnum.ADM_GERAL)
  @ApiOperation({ summary: 'Deleta uma empresa.' })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string): Promise<any> {
    return this.empresaService.remove(id);
  }

  @Post('delete-batch')
  @Roles(PerfisEnum.ADM_GERAL)
  @ApiOperation({ summary: 'Deleta várias empresas em massa.' })
  @HttpCode(HttpStatus.OK)
  async deleteBatch(@Body('ids') ids: string[]) {
    return this.empresaService.removeMany(ids);
  }

  // --- MÉTODOS DE UPLOAD ---

  @Post(':id/logo')
  @Roles(PerfisEnum.ADM_GERAL, PerfisEnum.GERENTE)
  @ApiOperation({ summary: 'Upload do logo da empresa.' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadLogo(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    return this.empresaService.updateLogo(id, file);
  }

  @Post(':id/assinatura')
  @Roles(PerfisEnum.ADM_GERAL, PerfisEnum.GERENTE)
  @ApiOperation({ summary: 'Upload da assinatura digitalizada.' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAssinatura(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    return this.empresaService.updateAssinatura(id, file);
  }

  @Patch(':id/chave-pix')
  @Roles(PerfisEnum.ADM_GERAL, PerfisEnum.GERENTE)
  @ApiOperation({ summary: 'Atualiza chave PIX da empresa' })
  async atualizarChavePix(
    @Param('id') id: string,
    @Body() chavePixDto: ChavePixEmpresaDto
  ) {
    return this.empresaService.atualizarChavePix(id, chavePixDto);
  }

  @Delete(':id/chave-pix')
  @Roles(PerfisEnum.ADM_GERAL, PerfisEnum.GERENTE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove chave PIX da empresa' })
  async removerChavePix(@Param('id') id: string) {
    return this.empresaService.removerChavePix(id);
  }

  @Post(':id/chaves-alternativas')
  @Roles(PerfisEnum.ADM_GERAL, PerfisEnum.GERENTE)
  @ApiOperation({ summary: 'Adiciona chave PIX alternativa' })
  async adicionarChaveAlternativa(
    @Param('id') id: string,
    @Body('chave') chave: string
  ) {
    return this.empresaService.adicionarChavePixAlternativa(id, chave);
  }

  @Get(':id/chave-pix-preferencial')
  @Roles(PerfisEnum.ADM_GERAL, PerfisEnum.GERENTE, PerfisEnum.CORRETOR)
  @ApiOperation({ summary: 'Obtém chave PIX preferencial da empresa' })
  async obterChavePixPreferencial(@Param('id') id: string) {
    const chavePix = await this.empresaService.obterChavePixPreferencial(id);
    return {
      possuiChavePix: !!chavePix,
      chavePix
    };
  }

}