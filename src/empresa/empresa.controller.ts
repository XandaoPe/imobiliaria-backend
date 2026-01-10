import {
  Controller, Get, Post, Body, Param, Delete, Put,
  HttpCode, HttpStatus, UseGuards, Query, UseInterceptors, UploadedFile
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { EmpresaService } from './empresa.service';
import { CreateEmpresaDto } from './dto/create-empresa.dto';
import { UpdateEmpresaDto } from './dto/update-empresa.dto';
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
}