import { Controller, Get, Post, Body, Param, Patch, Req, UseGuards, Query, HttpCode, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express'; 
import { FinanceiroService } from './financeiro.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { PerfisEnum } from 'src/usuario/schemas/usuario.schema';
import { FinanceiroFiltrosDto } from './dto/financeiro-filtros.dto';
import { FinanceiroPdfService } from './financeiro-pdf.service';
import { CreateFinanceiroDto } from './dto/create-financeiro.dto';

@ApiTags('Financeiro')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), RolesGuard) // Utilizando o padrão AuthGuard('jwt') do seu projeto
@Controller('financeiro')
export class FinanceiroController {
    constructor(
        private readonly financeiroService: FinanceiroService,
        private readonly financeiroPdfService: FinanceiroPdfService, // ⭐️ INJEÇÃO ADICIONADA
    ) { }

    @Post()
    @Roles(PerfisEnum.ADM_GERAL, PerfisEnum.GERENTE, PerfisEnum.CORRETOR)
    @ApiOperation({ summary: 'Cria um novo lançamento financeiro.' })
    async create(@Body() createDto: CreateFinanceiroDto, @Req() req) {
        // Pegamos o empresaId do token (req.user) para garantir o Multitenancy
        const empresaId = req.user.empresa;
        return this.financeiroService.create(createDto, empresaId);
    }

    @Get()
    @Roles(PerfisEnum.ADM_GERAL, PerfisEnum.GERENTE, PerfisEnum.CORRETOR)
    @ApiOperation({ summary: 'Lista todos os lançamentos financeiros da empresa.' })
    async findAll(@Req() req, @Query() filtros: FinanceiroFiltrosDto) { // ⭐️ DTO aplicado aqui
        const empresaId = req.user.empresa;
        return this.financeiroService.findAllByEmpresa(empresaId, filtros);
    }

    @Get('resumo')
    @Roles(PerfisEnum.ADM_GERAL, PerfisEnum.GERENTE)
    @ApiOperation({ summary: 'Retorna o resumo mensal (Receitas, Despesas, Pendentes).' })
    async getResumo(@Req() req) {
        const empresaId = req.user.empresa;
        return this.financeiroService.getResumoMensal(empresaId);
    }

    @Get(':id/recibo')
    @Roles(PerfisEnum.ADM_GERAL, PerfisEnum.GERENTE, PerfisEnum.CORRETOR)
    @ApiOperation({ summary: 'Gera o PDF do recibo para um lançamento.' })
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
    @ApiOperation({ summary: 'Registra o pagamento (baixa) de um lançamento.' })
    @HttpCode(HttpStatus.OK)
    async registrarPagamento(@Param('id') id: string, @Req() req) {
        const empresaId = req.user.empresa;
        return this.financeiroService.registrarPagamento(id, empresaId);
    }
}