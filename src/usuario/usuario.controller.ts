// src/usuario/usuario.controller.ts
import { Controller, Get, Post, Body, Param, Delete, Put, HttpCode, HttpStatus, UseGuards, Req, Query } from '@nestjs/common';
import { UsuarioService } from './usuario.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { Usuario, PerfisEnum } from './schemas/usuario.schema';
import { ApiOperation, ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UsuarioPayload } from 'src/auth/interfaces/usuario-payload.interface';

export interface RequestWithUser extends Request {
  user: UsuarioPayload;
}

const ROLES_ADMIN = [PerfisEnum.ADM_GERAL, PerfisEnum.GERENTE]; // Define quem pode gerenciar usuários

@ApiTags('Usuários')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), RolesGuard) // Protege o controller inteiro
@Controller('usuarios')
export class UsuarioController {
  constructor(private readonly usuarioService: UsuarioService) { }

  // POST /usuarios (Acesso restrito: ADM_GERAL e GERENTE)
  @Post()
  @Roles(...ROLES_ADMIN)
  @ApiOperation({ summary: 'Cria um novo Usuário (Multitenancy).' })
  @HttpCode(HttpStatus.CREATED)
  // O empresaId será validado no DTO, mas o token garante que o criador tem acesso
  create(
    @Req() req: RequestWithUser, // Adiciona Req
    @Body() createUsuarioDto: CreateUsuarioDto
  ): Promise<Usuario> {
    const empresaId = req.user.empresa; // ⬅️ Obtém o ID da empresa do token
    // ⭐️ CHAMA O SERVICE PASSANDO O empresaId
    return this.usuarioService.create(createUsuarioDto, empresaId);
  }

  @Get()
  @Roles(...ROLES_ADMIN)
  @ApiOperation({ summary: 'Lista Usuários da empresa logada (com busca opcional).' })
  @ApiQuery({ name: 'search', required: false, description: 'Termo de busca por nome ou email.' })
  @ApiQuery({ name: 'perfil', required: false, enum: PerfisEnum, description: 'Filtro por perfil do usuário.' })
  @ApiQuery({ name: 'ativo', required: false, enum: ['true', 'false'], description: 'Filtro por status de atividade.' })
  findAll(
    @Req() req: RequestWithUser,
    @Query('search') search?: string,
    @Query('perfil') perfil?: PerfisEnum,
    @Query('ativo') ativo?: string,
  ): Promise<Usuario[]> {
    const empresaId = req.user.empresa;
    console.log("req...", this.usuarioService.findAll)
    return this.usuarioService.findAll(empresaId, search, perfil, ativo);
  }

  // GET /usuarios/:id (Acesso restrito: ADM_GERAL e GERENTE - e o próprio usuário)
  @Get(':id')
  @Roles(...ROLES_ADMIN) // A política de acesso deve ser mais detalhada aqui
  @ApiOperation({ summary: 'Busca um Usuário por ID (Multitenancy).' })
  findOne(@Param('id') id: string, @Req() req: RequestWithUser): Promise<Usuario> {
    return this.usuarioService.findOne(id, req.user.empresa);
  }

  // PUT /usuarios/:id (Acesso restrito: ADM_GERAL e GERENTE)
  @Put(':id')
  @Roles(...ROLES_ADMIN)
  @ApiOperation({ summary: 'Atualiza um Usuário por ID (Multitenancy).' })
  update(
    @Param('id') id: string,
    @Body() updateUsuarioDto: UpdateUsuarioDto,
    @Req() req: RequestWithUser,
  ): Promise<Usuario> {
    return this.usuarioService.update(id, updateUsuarioDto, req.user.empresa);
  }

  // DELETE /usuarios/:id (Acesso restrito: ADM_GERAL)
  @Delete(':id')
  @Roles(PerfisEnum.ADM_GERAL) // Geralmente, apenas ADMs podem excluir permanentemente
  @ApiOperation({ summary: 'Remove um Usuário por ID (Apenas ADM Geral).' })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Req() req: RequestWithUser): Promise<any> {
    return this.usuarioService.remove(id, req.user.empresa);
  }
}