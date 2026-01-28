// src/negociacao/negociacao.controller.ts
import { Controller, Get, Post, Body, Patch, Param, UseGuards, Req, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { NegociacaoService } from './negociacao.service';
import { CreateNegociacaoDto } from './dto/create-negociacao.dto';
import { StatusNegociacao } from './schemas/negociacao.schema';
import type { RequestWithUser } from '../cliente/cliente.controller';
import { UpdateStatusNegociacaoDto } from './dto/update-status-negociacao.dto';

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
        return this.negociacaoService.findAll(req.user.empresa, search, status);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Atualiza status ou adiciona histórico na negociação' })
    async update(
        @Param('id') id: string,
        @Body() body: UpdateStatusNegociacaoDto,
        @Req() req: RequestWithUser
    ) {
        const empresaId = req.user.empresa;
        const usuarioPayload = req.user;
        const usuarioNome = req.user.nome || 'Sistema';

        // Se houver alteração de status, chama o updateStatus que agora recebe dadosFinanceiros
        if (body.status) {
            await this.negociacaoService.updateStatus(
                id,
                body.status,
                empresaId,
                usuarioPayload,
                body.dataAgendamento,
                body.dadosFinanceiros // Injeção dos dados para o fluxo financeiro
            );
        }

        // Se houver uma descrição, adiciona ao histórico
        if (body.descricao) {
            return await this.negociacaoService.addHistorico(
                id,
                empresaId,
                body.descricao,
                usuarioNome
            );
        }

        // Retorna a negociação atualizada
        return this.negociacaoService.findOne(id, empresaId);
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

    @Post(':id/refazer')
    @ApiOperation({ summary: 'Cancela a negociação atual e opcionalmente cria uma nova cópia' })
    async refazer(
        @Param('id') id: string,
        @Body('gerarNovaProspeccao') gerarNovaProspeccao: boolean, // Captura o booleano do Body
        @Req() req: RequestWithUser
    ) {
        return await this.negociacaoService.refazerNegociacao(
            id,
            req.user.empresa,
            req.user,
            gerarNovaProspeccao // Passa para o service
        );
    }

    @Post(':id/notificar-visita')
    @ApiOperation({ summary: 'Envia notificação de visita agendada para os corretores' })
    async notificarVisita(
        @Param('id') id: string,
        @Body() body: {
            dataVisita: string;
            horaVisita: string;
            imovelTitulo: string;
            clienteNome: string;
            corretorNome: string;
        },
        @Req() req: RequestWithUser
    ) {
        return this.negociacaoService.notificarVisitaAgendada(
            id,
            body,
            req.user.empresa,
            req.user
        );
    }
}