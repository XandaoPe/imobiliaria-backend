// src/contrato/contrato.controller.ts
import { Controller, Post, Body, UseGuards, Get, Req, HttpStatus, HttpCode, Put, Param, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { PerfisEnum } from 'src/usuario/schemas/usuario.schema'; // ⭐️ ATUALIZADO PARA PerfisEnum
import { ContratoService } from './contrato.service';
import { CreateContratoDto } from './dto/create-contrato.dto';
import { UpdateContratoDto } from './dto/update-contrato.dto';
import { Contrato } from './schemas/contrato.schema';
import { UsuarioPayload } from 'src/auth/jwt.strategy';

export interface RequestWithUser extends Request {
  user: UsuarioPayload;
}

// ⭐️ ATUALIZADO: Usando PerfisEnum
const ROLES_ACESS = [PerfisEnum.CORRETOR, PerfisEnum.GERENTE, PerfisEnum.ADM_GERAL];

@ApiTags('Contratos')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('contratos')
export class ContratoController {
  constructor(private readonly contratoService: ContratoService) { }

  // ⭐️ CREATE
  @Post()
  @Roles(...ROLES_ACESS)
  @ApiOperation({ summary: 'Cria um novo contrato (Venda/Locação).' })
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() createContratoDto: CreateContratoDto,
    @Req() req: RequestWithUser,
  ): Promise<Contrato> {
    return this.contratoService.create(createContratoDto, req.user);
  }

  // ⭐️ FIND ALL
  @Get()
  @Roles(...ROLES_ACESS)
  @ApiOperation({ summary: 'Lista todos os contratos da empresa.' })
  findAll(@Req() req: RequestWithUser): Promise<Contrato[]> {
    return this.contratoService.findAll(req.user.empresa);
  }

  // ⭐️ FIND ONE
  @Get(':id')
  @Roles(...ROLES_ACESS)
  @ApiOperation({ summary: 'Busca um contrato por ID.' })
  findOne(@Param('id') id: string, @Req() req: RequestWithUser): Promise<Contrato> {
    return this.contratoService.findOne(id, req.user.empresa);
  }

  // ⭐️ UPDATE
  @Put(':id')
  @Roles(PerfisEnum.GERENTE, PerfisEnum.ADM_GERAL) // Restringir atualização
  @ApiOperation({ summary: 'Atualiza um contrato por ID (Apenas Gerente/ADM).' })
  update(
    @Param('id') id: string,
    @Body() updateContratoDto: UpdateContratoDto,
    @Req() req: RequestWithUser,
  ): Promise<Contrato> {
    return this.contratoService.update(id, updateContratoDto, req.user.empresa);
  }

  // ⭐️ DELETE
  @Delete(':id')
  @Roles(PerfisEnum.ADM_GERAL) // Apenas ADM_GERAL pode deletar permanentemente
  @ApiOperation({ summary: 'Remove um contrato por ID (Apenas ADM).' })
  remove(@Param('id') id: string, @Req() req: RequestWithUser): Promise<{ message: string }> {
    return this.contratoService.remove(id, req.user.empresa);
  }
}