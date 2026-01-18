// src/configuracao/configuracao.controller.ts
import { Controller, Get, Post, Body, UseGuards, Req, Param } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ConfiguracaoService } from './configuracao.service';
import { CreateConfiguracaoDto } from './dto/create-configuracao.dto';
import type { RequestWithUser } from 'src/cliente/cliente.controller';

@ApiTags('Configurações')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'))
@Controller('configuracoes')
export class ConfiguracaoController {
    constructor(private readonly configService: ConfiguracaoService) { }

    @Post()
    @ApiOperation({ summary: 'Cria ou atualiza uma configuração da empresa' })
    upsert(@Body() dto: CreateConfiguracaoDto, @Req() req: RequestWithUser) {
        return this.configService.upsert(dto, req.user.empresa);
    }

    @Get()
    @ApiOperation({ summary: 'Lista todas as configurações da empresa' })
    findAll(@Req() req: RequestWithUser) {
        return this.configService.findAll(req.user.empresa);
    }

    @Get(':chave')
    @ApiOperation({ summary: 'Busca um parâmetro específico pela chave' })
    findOne(@Param('chave') chave: string, @Req() req: RequestWithUser) {
        return this.configService.findByChave(chave, req.user.empresa);
    }
}