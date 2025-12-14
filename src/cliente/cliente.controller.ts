// src/cliente/cliente.controller.ts
import { Controller, Get, Post, Body, Param, Delete, Put, UseGuards, Req, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';

import { ClienteService } from './cliente.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { Cliente } from './schemas/cliente.schema';

// ⭐️ NOVO: Importar o payload tipado (Ajuste o caminho conforme o seu projeto)
import { UsuarioPayload } from 'src/auth/interfaces/usuario-payload.interface';

// ⭐️ NOVO: Interface para tipar o objeto Request injetado
export interface RequestWithUser extends Request {
  user: UsuarioPayload;
}

// Aplica a Tag e o Requisito de JWT a todo o controlador
@ApiTags('Clientes')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'))
@Controller('clientes')
export class ClienteController {
  constructor(private readonly clienteService: ClienteService) { }

  // POST /clientes
  @Post()
  @ApiOperation({ summary: 'Cria um novo cliente, vinculado à empresa do usuário logado.' })
  // ⭐️ Usar @Req() e tipar com RequestWithUser
  create(@Body() createClienteDto: CreateClienteDto, @Req() req: RequestWithUser): Promise<Cliente> {
    // ⭐️ CORREÇÃO: Acessar req.user.empresa
    const empresaId = req.user.empresa;
    return this.clienteService.create(createClienteDto, empresaId);
  }

  // GET /clientes
  @Get()
  @ApiOperation({ summary: 'Lista todos os clientes pertencentes APENAS à empresa do usuário logado, com opção de busca por texto em todos os campos.' })
  @ApiQuery({ name: 'search', required: false, description: 'Termo de busca por nome, endereço...' })
  @ApiQuery({ name: 'status', required: false, description: 'Termo de busca por ativo e inativo' })

  // ⭐️ NOVO: Usar @Query('search') search?: string
  findAll(
    @Req() req: RequestWithUser,
    @Query('search') search?: string,
    @Query('status') status?: string // <-- ADICIONADO AQUI
  ): Promise<Cliente[]> {
    const empresaId = req.user.empresa;
    // ⭐️ Passar o status (opcional) para o Service
    return this.clienteService.findAll(empresaId, search, status);
  }

  // GET /clientes/:id
  @Get(':id')
  @ApiOperation({ summary: 'Busca um cliente por ID, garantindo que ele pertence à empresa logada.' })
  // ⭐️ Usar @Req() e tipar com RequestWithUser
  findOne(@Param('id') id: string, @Req() req: RequestWithUser): Promise<Cliente> {
    // ⭐️ CORREÇÃO: Acessar req.user.empresa
    const empresaId = req.user.empresa;
    return this.clienteService.findOne(id, empresaId);
  }

  // PUT /clientes/:id
  @Put(':id')
  @ApiOperation({ summary: 'Atualiza um cliente por ID, garantindo que ele pertence à empresa logada.' })
  // ⭐️ Usar @Req() e tipar com RequestWithUser
  update(@Param('id') id: string, @Body() updateClienteDto: UpdateClienteDto, @Req() req: RequestWithUser): Promise<Cliente> {
    // ⭐️ CORREÇÃO: Acessar req.user.empresa
    const empresaId = req.user.empresa;
    return this.clienteService.update(id, updateClienteDto, empresaId);
  }

  // DELETE /clientes/:id
  @Delete(':id')
  @ApiOperation({ summary: 'Deleta um cliente por ID, garantindo que ele pertence à empresa logada.' })
  // ⭐️ Usar @Req() e tipar com RequestWithUser
  // ⚠️ NOTA: A tipagem de retorno Promise<void> aqui está incorreta se o Service retorna Promise<{ message: string }>
  // Se o Service retornar um objeto, a assinatura no Controller deve ser Promise<{ message: string }> ou similar.
  remove(@Param('id') id: string, @Req() req: RequestWithUser): Promise<any> {
    // ⭐️ CORREÇÃO: Acessar req.user.empresa
    const empresaId = req.user.empresa;
    // Ajustei o retorno para Promise<any> para evitar outro erro de tipagem no momento.
    return this.clienteService.remove(id, empresaId);
  }
}