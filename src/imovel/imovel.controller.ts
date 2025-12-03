// src/imovel/imovel.controller.ts
import { Controller, Get, Post, Body, Param, Delete, Put, UseGuards, Request, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

import { ImovelService } from './imovel.service';
import { CreateImovelDto } from './dto/create-imovel.dto';
import { UpdateImovelDto } from './dto/update-imovel.dto';
import { Imovel } from './schemas/imovel.schema';

// Aplica a Tag e o Requisito de JWT a todo o controlador
@ApiTags('Imóveis')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt')) // ⭐️ Protege TODAS as rotas deste controlador
@Controller('imoveis')
export class ImovelController {
  constructor(private readonly imovelService: ImovelService) { }

  // POST /imoveis
  @Post()
  @ApiOperation({ summary: 'Cria um novo imóvel, vinculado à empresa do usuário logado.' })
  create(@Body() createImovelDto: CreateImovelDto, @Request() req): Promise<Imovel> {
    // ⭐️ MULTITENANCY: O empresaId é extraído do token
    const empresaId = req.user.empresaId;
    return this.imovelService.create(createImovelDto, empresaId);
  }

  // GET /imoveis
  @Get()
  @ApiOperation({ summary: 'Lista todos os imóveis pertencentes APENAS à empresa do usuário logado.' })
  findAll(@Request() req): Promise<Imovel[]> {
    // ⭐️ MULTITENANCY: O empresaId é usado como filtro
    const empresaId = req.user.empresaId;
    return this.imovelService.findAll(empresaId);
  }

  // GET /imoveis/:id
  @Get(':id')
  @ApiOperation({ summary: 'Busca um imóvel por ID, garantindo que ele pertence à empresa logada.' })
  findOne(@Param('id') id: string, @Request() req): Promise<Imovel> {
    const empresaId = req.user.empresaId;
    return this.imovelService.findOne(id, empresaId);
  }

  // PUT /imoveis/:id
  @Put(':id')
  @ApiOperation({ summary: 'Atualiza um imóvel por ID, garantindo que ele pertence à empresa logada.' })
  update(@Param('id') id: string, @Body() updateImovelDto: UpdateImovelDto, @Request() req): Promise<Imovel> {
    const empresaId = req.user.empresaId;
    return this.imovelService.update(id, updateImovelDto, empresaId);
  }

  // DELETE /imoveis/:id
  @Delete(':id')
  @ApiOperation({ summary: 'Deleta um imóvel por ID, garantindo que ele pertence à empresa logada.' })
  remove(@Param('id') id: string, @Request() req): Promise<void> {
    const empresaId = req.user.empresaId;
    return this.imovelService.remove(id, empresaId);
  }
}