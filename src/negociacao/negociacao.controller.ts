import { Controller, Get, Post, Body, Patch, Param, UseGuards, Req, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NegociacaoService } from './negociacao.service';
import { CreateNegociacaoDto } from './dto/create-negociacao.dto';
import { StatusNegociacao } from './schemas/negociacao.schema';
import type { RequestWithUser } from '../cliente/cliente.controller'; // Reaproveitando sua interface

@ApiTags('Negociações (CRM)')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'))
@Controller('negociacoes')
export class NegociacaoController {
    constructor(private readonly negociacaoService: NegociacaoService) { }

    @Post()
    @ApiOperation({ summary: 'Inicia uma nova negociação de venda ou aluguel' })
    create(@Body() createDto: CreateNegociacaoDto, @Req() req: RequestWithUser) {
        // Usamos o nome do usuário vindo do payload do token para o histórico inicial
        const usuarioNome = req.user.nome || 'Sistema';
        return this.negociacaoService.create(createDto, req.user.empresa, usuarioNome);
    }

    @Get()
    @ApiOperation({ summary: 'Lista todas as negociações da empresa' })
    findAll(@Req() req: RequestWithUser) {
        return this.negociacaoService.findAll(req.user.empresa);
    }

    @Patch(':id') // Removi o /status daqui
    @ApiOperation({ summary: 'Atualiza status e adiciona histórico em uma única chamada' })
    async update(
        @Param('id') id: string,
        @Body() body: { status?: StatusNegociacao; descricao?: string },
        @Req() req: RequestWithUser
    ) {
        const empresaId = req.user.empresa;
        const usuarioNome = req.user.nome || 'Corretor';

        // Se veio status no corpo da requisição, chama o service de status
        if (body.status) {
            await this.negociacaoService.updateStatus(id, body.status, empresaId);
        }

        // Se veio descrição, chama o service de histórico
        if (body.descricao) {
            return await this.negociacaoService.addHistorico(id, empresaId, body.descricao, usuarioNome);
        }

        return { message: 'Negociação atualizada' };
    }

    @Post(':id/historico')
    @ApiOperation({ summary: 'Adiciona uma anotação de acompanhamento na timeline' })
    addHistorico(
        @Param('id') id: string,
        @Body('descricao') descricao: string,
        @Req() req: RequestWithUser,
    ) {
        const usuarioNome = req.user.nome || 'Corretor';
        return this.negociacaoService.addHistorico(id, req.user.empresa, descricao, usuarioNome);
    }
}