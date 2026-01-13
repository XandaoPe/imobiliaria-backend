import { Controller, Get, Post, Body, Patch, Param, UseGuards, Req, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { NegociacaoService } from './negociacao.service';
import { CreateNegociacaoDto } from './dto/create-negociacao.dto';
import { StatusNegociacao } from './schemas/negociacao.schema';
import type { RequestWithUser } from '../cliente/cliente.controller';

@ApiTags('Negociações (CRM)')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'))
@Controller('negociacoes')
export class NegociacaoController {
    constructor(private readonly negociacaoService: NegociacaoService) { }

    @Post()
    @ApiOperation({ summary: 'Inicia uma nova negociação de venda ou aluguel' })
    create(@Body() createDto: CreateNegociacaoDto, @Req() req: RequestWithUser) {
        const usuarioNome = req.user.nome || 'Sistema';
        return this.negociacaoService.create(createDto, req.user.empresa, usuarioNome);
    }

    @Get()
    @ApiOperation({ summary: 'Lista todas as negociações da empresa com filtros' })
    @ApiQuery({ name: 'search', required: false, type: String })
    @ApiQuery({ name: 'status', required: false, enum: ['PROSPECCAO', 'VISITA', 'PROPOSTA', 'FECHADO', 'PERDIDO'] })
    findAll(
        @Req() req: RequestWithUser,
        @Query('search') search?: string,
        @Query('status') status?: string
    ) {
        // Agora passamos os filtros de busca para o Service
        return this.negociacaoService.findAll(req.user.empresa, search, status);
    }

    @Patch(':id')
    async update(
        @Param('id') id: string,
        @Body() body: { status?: StatusNegociacao; descricao?: string; dataAgendamento?: string },
        @Req() req: RequestWithUser
    ) {
        const empresaId = req.user.empresa;
        const usuarioPayload = req.user;
        const usuarioNome = req.user.nome || 'Sistema';

        if (body.status) {
            await this.negociacaoService.updateStatus(
                id,
                body.status,
                empresaId,
                usuarioPayload,
                body.dataAgendamento
            );
        }

        if (body.descricao) {
            return await this.negociacaoService.addHistorico(
                id,
                empresaId,
                body.descricao,
                usuarioNome
            );
        }

        // Importante: atualizar o findAll aqui também se quiser manter o retorno filtrado após o patch
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