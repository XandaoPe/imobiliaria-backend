// src/cliente/cliente.controller.ts
import { Controller, Get, Post, Body, Param, Delete, Put, UseGuards, Req, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';

import { ClienteService } from './cliente.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { Cliente } from './schemas/cliente.schema';

// ⭐️ NOVO: Importar o payload tipado (Ajuste o caminho conforme o seu projeto)
import { UsuarioPayload } from 'src/auth/interfaces/usuario-payload.interface';
import { ChavePixDto, ValidarChavePixDto } from 'src/shared/dto/chave-pix.dto';

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

  // 🔑 NOVO: Adicionar/atualizar chave PIX do cliente
  @Post(':id/chave-pix')
  @ApiOperation({ summary: 'Adiciona ou atualiza chave PIX do cliente' })
  async adicionarChavePix(
    @Param('id') id: string,
    @Body() chavePixDto: ChavePixDto,
    @Req() req: RequestWithUser
  ) {
    return this.clienteService.adicionarChavePix(id, chavePixDto, req.user.empresa);
  }

  // 🔑 NOVO: Remover chave PIX do cliente
  @Delete(':id/chave-pix')
  @ApiOperation({ summary: 'Remove chave PIX do cliente' })
  @HttpCode(HttpStatus.OK)
  async removerChavePix(
    @Param('id') id: string,
    @Req() req: RequestWithUser
  ) {
    return this.clienteService.removerChavePix(id, req.user.empresa);
  }

  // 🔑 NOVO: Validar chave PIX do cliente
  @Post(':id/validar-chave-pix')
  @ApiOperation({ summary: 'Valida chave PIX do cliente com código de verificação' })
  async validarChavePix(
    @Param('id') id: string,
    @Body() validarDto: ValidarChavePixDto,
    @Req() req: RequestWithUser
  ) {
    return this.clienteService.validarChavePix(id, validarDto, req.user.empresa);
  }

  // 🔑 NOVO: Listar clientes com chave PIX válida
  @Get('com-chave-pix/validada')
  @ApiOperation({ summary: 'Lista todos os clientes com chave PIX validada' })
  async listarComChavePixValida(@Req() req: RequestWithUser) {
    return this.clienteService.listarComChavePix(req.user.empresa);
  }

  // 🔑 NOVO: Verificar se cliente tem chave PIX válida
  @Get(':id/tem-chave-pix')
  @ApiOperation({ summary: 'Verifica se o cliente possui chave PIX válida cadastrada' })
  async temChavePixValida(
    @Param('id') id: string,
    @Req() req: RequestWithUser
  ) {
    const temChave = await this.clienteService.temChavePix(id, req.user.empresa);
    return { temChavePix: temChave };
  }

}