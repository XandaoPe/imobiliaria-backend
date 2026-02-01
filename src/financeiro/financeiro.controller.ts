// src/financeiro/financeiro.controller.ts
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import {
    Controller, Get, Post, Body, Param, Patch, Req, UseGuards,
    Query, HttpCode, HttpStatus, Res, NotFoundException
} from '@nestjs/common';
import type { Response } from 'express';
import { FinanceiroService } from './financeiro.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { PerfisEnum } from 'src/usuario/schemas/usuario.schema';
import { FinanceiroFiltrosDto } from './dto/financeiro-filtros.dto';
import { FinanceiroPdfService } from './financeiro-pdf.service';
import { CreateFinanceiroDto } from './dto/create-financeiro.dto';
import { Public } from 'src/auth/decorators/public.decorator';

@ApiTags('Financeiro')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('financeiro')
export class FinanceiroController {
    constructor(
        private readonly financeiroService: FinanceiroService,
        private readonly financeiroPdfService: FinanceiroPdfService,
    ) { }

    @Post()
    @Roles(PerfisEnum.ADM_GERAL, PerfisEnum.GERENTE, PerfisEnum.CORRETOR)
    @ApiOperation({ summary: 'Cria um novo lançamento financeiro.' })
    async create(@Body() createDto: CreateFinanceiroDto, @Req() req) {
        const empresaId = req.user.empresa;
        return this.financeiroService.create(createDto, empresaId);
    }

    @Get()
    @Roles(PerfisEnum.ADM_GERAL, PerfisEnum.GERENTE, PerfisEnum.CORRETOR)
    @ApiOperation({ summary: 'Lista todos os lançamentos financeiros da empresa.' })
    async findAll(@Req() req, @Query() filtros: FinanceiroFiltrosDto) {
        const empresaId = req.user.empresa;
        // Aqui o objeto 'filtros' já contém o campo 'search' vindo da query string
        return this.financeiroService.findAllByEmpresa(empresaId, filtros);
    }

    @Get('resumo')
    @Roles(PerfisEnum.ADM_GERAL, PerfisEnum.GERENTE)
    @ApiOperation({ summary: 'Retorna o resumo filtrado e dados para o gráfico.' })
    async getResumo(@Req() req, @Query() filtros: FinanceiroFiltrosDto) {
        const empresaId = req.user.empresa;
        return await this.financeiroService.getResumo(empresaId, filtros);
    }

    @Get('validar/:id')
    @Public()
    async validarRecibo(@Param('id') id: string) {
        const dados = await this.financeiroService.buscarDadosParaReciboSimples(id);
        if (!dados || !dados.lancamento || !dados.empresa) {
            throw new NotFoundException('Recibo inválido ou não encontrado.');
        }
        const { lancamento, empresa } = dados;
        const clientePopulado = lancamento.cliente as any;
        return {
            valido: true,
            cliente: clientePopulado?.nome || 'Não identificado',
            valor: lancamento.valor,
            data: lancamento.dataPagamento || lancamento.dataVencimento,
            emissor: empresa.nome,
            descricao: lancamento.descricao
        };
    }

    @Get(':id/recibo')
    @Roles(PerfisEnum.ADM_GERAL, PerfisEnum.GERENTE, PerfisEnum.CORRETOR)
    async baixarRecibo(@Param('id') id: string, @Req() req, @Res() res: Response) {
        const empresaId = req.user.empresa;
        const { lancamento, empresa } = await this.financeiroService.buscarDadosParaRecibo(id, empresaId);
        const buffer = await this.financeiroPdfService.gerarRecibo(lancamento, empresa);
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename=recibo-${id}.pdf`,
            'Content-Length': buffer.length,
        });
        res.end(buffer);
    }

    @Patch(':id/pagar')
    @Roles(PerfisEnum.ADM_GERAL, PerfisEnum.GERENTE)
    @HttpCode(HttpStatus.OK)
    async registrarPagamento(@Param('id') id: string, @Req() req) {
        const empresaId = req.user.empresa;
        return this.financeiroService.registrarPagamento(id, empresaId);
    }
}