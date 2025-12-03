// src/usuario/usuario.controller.ts
import { Controller, Get, Post, Body, Param, Delete, Put, HttpCode, HttpStatus } from '@nestjs/common';
import { UsuarioService } from './usuario.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { Usuario } from './schemas/usuario.schema';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Usuários')
@Controller('usuarios') // Rota base: /usuarios
export class UsuarioController {
  constructor(private readonly usuarioService: UsuarioService) { }

  // POST /usuarios
  // Rota de criação de usuário (Poderá ser protegida futuramente)
  @Post()
  @ApiOperation({ summary: 'Cria um novo Usuário.' })
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createUsuarioDto: CreateUsuarioDto): Promise<Usuario> {
    return this.usuarioService.create(createUsuarioDto);
  }

  // GET /usuarios
  // Futuramente, esta rota deve retornar apenas usuários da empresa do token
  @Get()
  @ApiOperation({ summary: 'Lista Usuários.' })
  findAll(): Promise<Usuario[]> {
    return this.usuarioService.findAll();
  }

  // GET /usuarios/:id
  @Get(':id')
  @ApiOperation({ summary: 'Lista Usuário específico.' })
  findOne(@Param('id') id: string): Promise<Usuario> {
    return this.usuarioService.findOne(id);
  }

  // PUT /usuarios/:id
  // @Put(':id')
  // update(@Param('id') id: string, @Body() updateUsuarioDto: UpdateUsuarioDto): Promise<Usuario> {
  //   // Note que o serviço de update não foi implementado, mas a rota está definida
  //   // return this.usuarioService.update(id, updateUsuarioDto); 
  //   return null; // Retorno temporário
  // }

  // // DELETE /usuarios/:id
  // @Delete(':id')
  // @HttpCode(HttpStatus.NO_CONTENT)
  // remove(@Param('id') id: string): Promise<any> {
  //   // Note que o serviço de remove não foi implementado, mas a rota está definida
  //   // return this.usuarioService.remove(id);
  //   return null; // Retorno temporário
  // }
}