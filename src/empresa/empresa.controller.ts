// src/empresa/empresa.controller.ts
import { Controller, Get, Post, Body, Param, Delete, Put, HttpCode, HttpStatus } from '@nestjs/common';
import { EmpresaService } from './empresa.service';
import { CreateEmpresaDto } from './dto/create-empresa.dto';
import { UpdateEmpresaDto } from './dto/update-empresa.dto';
import { Empresa } from './schemas/empresa.schema';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Empresas')
@Controller('empresas') // Rota base: /empresas
export class EmpresaController {
  constructor(private readonly empresaService: EmpresaService) { }

  // POST /empresas
  @Post()
  @ApiOperation({ summary: 'Cria uma nova empresa.' })
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createEmpresaDto: CreateEmpresaDto): Promise<Empresa> {
    return this.empresaService.create(createEmpresaDto);
  }

  // GET /empresas
  @Get()
  @ApiOperation({ summary: 'Lista empresa.' })
  findAll(): Promise<Empresa[]> {
    return this.empresaService.findAll();
  }

  // GET /empresas/:id
  @Get(':id')
  @ApiOperation({ summary: 'Lista empresa específica.' })
  findOne(@Param('id') id: string): Promise<Empresa> {
    return this.empresaService.findOne(id);
  }

  // PUT /empresas/:id
  @Put(':id')
  @ApiOperation({ summary: 'Altera empresa.' })
  update(@Param('id') id: string, @Body() updateEmpresaDto: UpdateEmpresaDto): Promise<Empresa> {
    return this.empresaService.update(id, updateEmpresaDto);
  }

  // DELETE /empresas/:id
  @Delete(':id')
  @ApiOperation({ summary: 'Deleta empresa.' })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string): Promise<any> {
    return this.empresaService.remove(id);
  }
}