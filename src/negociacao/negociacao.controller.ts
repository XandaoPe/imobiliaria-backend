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

    @Patch(':id')
    async update(
        @Param('id') id: string,
        @Body() body: { status?: StatusNegociacao; descricao?: string; dataAgendamento?: string },
        @Req() req: RequestWithUser // 👈 Use a interface tipada aqui
    ) {
        const empresaId = req.user.empresa;
        const usuarioPayload = req.user;
        const usuarioNome = req.user.nome || 'Sistema'; // 👈 DECLARAÇÃO DA VARIÁVEL

        // 1. Se houver mudança de status
        if (body.status) {
            await this.negociacaoService.updateStatus(
                id,
                body.status,
                empresaId,
                usuarioPayload,
                body.dataAgendamento
            );
        }

        // 2. Se houver uma descrição (anotação), adicionamos ao histórico
        if (body.descricao) {
            return await this.negociacaoService.addHistorico(
                id,
                empresaId,
                body.descricao,
                usuarioNome
            );
        }

        // 3. Caso mude apenas o status, retornamos a lista ou a negociação atualizada
        return this.negociacaoService.findAll(empresaId);
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