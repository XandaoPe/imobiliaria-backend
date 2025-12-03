// src/cliente/cliente.controller.ts
import { Controller, Get, Post, Body, Param, Delete, Put, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

import { ClienteService } from './cliente.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { Cliente } from './schemas/cliente.schema';

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
  create(@Body() createClienteDto: CreateClienteDto, @Request() req): Promise<Cliente> {
    const empresaId = req.user.empresaId;
    return this.clienteService.create(createClienteDto, empresaId);
  }

  // GET /clientes
  @Get()
  @ApiOperation({ summary: 'Lista todos os clientes pertencentes APENAS à empresa do usuário logado.' })
  findAll(@Request() req): Promise<Cliente[]> {
    const empresaId = req.user.empresaId;
    console.log('Empresa ID no ClienteController findAll:', empresaId);
    return this.clienteService.findAll(empresaId);
  }

  // GET /clientes/:id
  @Get(':id')
  @ApiOperation({ summary: 'Busca um cliente por ID, garantindo que ele pertence à empresa logada.' })
  findOne(@Param('id') id: string, @Request() req): Promise<Cliente> {
    const empresaId = req.user.empresaId;
    return this.clienteService.findOne(id, empresaId);
  }

  // PUT /clientes/:id
  @Put(':id')
  @ApiOperation({ summary: 'Atualiza um cliente por ID, garantindo que ele pertence à empresa logada.' })
  update(@Param('id') id: string, @Body() updateClienteDto: UpdateClienteDto, @Request() req): Promise<Cliente> {
    const empresaId = req.user.empresaId;
    return this.clienteService.update(id, updateClienteDto, empresaId);
  }

  // DELETE /clientes/:id
  @Delete(':id')
  @ApiOperation({ summary: 'Deleta um cliente por ID, garantindo que ele pertence à empresa logada.' })
  remove(@Param('id') id: string, @Request() req): Promise<void> {
    const empresaId = req.user.empresaId;
    return this.clienteService.remove(id, empresaId);
  }
}