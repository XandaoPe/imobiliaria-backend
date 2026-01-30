import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
    HttpStatus,
    HttpCode
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ComissaoService } from './comissao.service';
import { DistribuirComissaoDto } from './dto/distribuir-comissao.dto';
import { PagarComissaoDto } from './dto/pagar-comissao.dto';
import { FiltrarComissaoDto } from './dto/filtrar-comissao.dto';
import { AuthGuard } from '@nestjs/passport';
import { PerfisEnum } from '../usuario/schemas/usuario.schema';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { ComissaoRegraService } from './comissao-regra.service';
import { Roles } from 'src/auth/decorators/roles.decorator';

@ApiTags('Comissões')
@ApiBearerAuth()
@Controller('comissoes')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ComissaoController {
    constructor(
        private readonly comissaoService: ComissaoService,
        private readonly comissaoRegraService: ComissaoRegraService,
    ) { }

    /**
     * Distribuir comissões para um lançamento financeiro
     */
    @Post('distribuir/:financeiroId')
    @Roles(PerfisEnum.ADM_GERAL, PerfisEnum.GERENTE)
    @ApiOperation({ summary: 'Distribuir comissões para um lançamento financeiro' })
    @ApiResponse({ status: 201, description: 'Comissões distribuídas com sucesso' })
    @ApiResponse({ status: 400, description: 'Dados inválidos ou já distribuído' })
    @ApiResponse({ status: 404, description: 'Lançamento financeiro não encontrado' })
    async distribuirComissoes(
        @Param('financeiroId') financeiroId: string,
        @Body() dto: DistribuirComissaoDto,
        @Request() req,
    ) {
        const usuarioId = req.user.id;
        return await this.comissaoService.distribuirComissoes(financeiroId, dto, usuarioId);
    }

    /**
     * Listar comissões com filtros
     */
    @Get()
    @Roles(PerfisEnum.ADM_GERAL, PerfisEnum.GERENTE, PerfisEnum.CORRETOR)
    @ApiOperation({ summary: 'Listar comissões com filtros' })
    @ApiResponse({ status: 200, description: 'Lista de comissões retornada com sucesso' })
    async listarComissoes(
        @Query() filtros: FiltrarComissaoDto,
        @Request() req,
    ) {
        const empresaId = req.user.empresa;
        return await this.comissaoService.listarComissoes(empresaId, filtros);
    }

    /**
     * Buscar comissões de um usuário específico
     */
    @Get('usuario/:usuarioId')
    @Roles(PerfisEnum.ADM_GERAL, PerfisEnum.GERENTE, PerfisEnum.CORRETOR)
    @ApiOperation({ summary: 'Buscar comissões de um usuário específico' })
    @ApiResponse({ status: 200, description: 'Comissões do usuário retornadas com sucesso' })
    @ApiResponse({ status: 403, description: 'Acesso negado' })
    async comissoesPorUsuario(
        @Param('usuarioId') usuarioId: string,
        @Request() req,
    ) {
        const empresaId = req.user.empresa;
        return await this.comissaoService.comissoesPorUsuario(usuarioId, empresaId);
    }

    /**
     * Minhas comissões (do usuário logado)
     */
    @Get('minhas')
    @Roles(PerfisEnum.ADM_GERAL, PerfisEnum.GERENTE, PerfisEnum.CORRETOR)
    @ApiOperation({ summary: 'Buscar minhas comissões (usuário logado)' })
    @ApiResponse({ status: 200, description: 'Minhas comissões retornadas com sucesso' })
    async minhasComissoes(@Request() req) {
        const usuarioId = req.user.id;
        const empresaId = req.user.empresa;
        return await this.comissaoService.comissoesPorUsuario(usuarioId, empresaId);
    }

    /**
     * Pagar comissões
     */
    @Post('pagar')
    @Roles(PerfisEnum.ADM_GERAL, PerfisEnum.GERENTE)
    @ApiOperation({ summary: 'Pagar comissões selecionadas' })
    @ApiResponse({ status: 200, description: 'Comissões pagas com sucesso' })
    @ApiResponse({ status: 404, description: 'Comissões não encontradas' })
    @HttpCode(HttpStatus.OK)
    async pagarComissoes(
        @Body() dto: PagarComissaoDto,
        @Request() req,
    ) {
        const usuarioPagadorId = req.user.id;
        return await this.comissaoService.pagarComissoes(dto, usuarioPagadorId);
    }

    /**
     * Aprovar comissões
     */
    @Put('aprovar')
    @Roles(PerfisEnum.ADM_GERAL, PerfisEnum.GERENTE)
    @ApiOperation({ summary: 'Aprovar comissões selecionadas' })
    @ApiResponse({ status: 200, description: 'Comissões aprovadas com sucesso' })
    @ApiQuery({ name: 'comissaoIds', type: [String], required: true, example: 'id1,id2,id3' })
    async aprovarComissoes(
        @Query('comissaoIds') comissaoIds: string,
        @Request() req,
    ) {
        const idsArray = comissaoIds.split(',');
        const usuarioAprovadorId = req.user.id;
        return await this.comissaoService.aprovarComissoes(idsArray, usuarioAprovadorId);
    }

    /**
     * Cancelar comissões
     */
    @Put('cancelar')
    @Roles(PerfisEnum.ADM_GERAL, PerfisEnum.GERENTE)
    @ApiOperation({ summary: 'Cancelar comissões selecionadas' })
    @ApiResponse({ status: 200, description: 'Comissões canceladas com sucesso' })
    @ApiQuery({ name: 'comissaoIds', type: [String], required: true, example: 'id1,id2,id3' })
    @ApiQuery({ name: 'motivo', type: String, required: true })
    async cancelarComissoes(
        @Query('comissaoIds') comissaoIds: string,
        @Query('motivo') motivo: string,
        @Request() req,
    ) {
        const idsArray = comissaoIds.split(',');
        const usuarioCanceladorId = req.user.id;
        return await this.comissaoService.cancelarComissoes(idsArray, motivo, usuarioCanceladorId);
    }

    /**
     * Relatório de comissões por período
     */
    @Get('relatorio')
    @Roles(PerfisEnum.ADM_GERAL, PerfisEnum.GERENTE)
    @ApiOperation({ summary: 'Relatório de comissões por período' })
    @ApiResponse({ status: 200, description: 'Relatório gerado com sucesso' })
    @ApiQuery({ name: 'dataInicio', required: true, example: '2024-01-01' })
    @ApiQuery({ name: 'dataFim', required: true, example: '2024-12-31' })
    async relatorioComissoes(
        @Query('dataInicio') dataInicio: string,
        @Query('dataFim') dataFim: string,
        @Request() req,
    ) {
        const empresaId = req.user.empresa;
        return await this.comissaoService.relatorioComissoes(empresaId, dataInicio, dataFim);
    }

    /**
     * Dashboard/resumo de comissões
     */
    @Get('dashboard')
    @Roles(PerfisEnum.ADM_GERAL, PerfisEnum.GERENTE, PerfisEnum.CORRETOR)
    @ApiOperation({ summary: 'Dashboard/resumo de comissões' })
    @ApiResponse({ status: 200, description: 'Dashboard retornado com sucesso' })
    async dashboardComissoes(@Request() req) {
        const empresaId = req.user.empresa;
        const usuarioId = req.user.id;
        const perfil = req.user.perfil;

        // Implementar lógica do dashboard
        // (Valores pendentes, pagos, totais, etc.)
        return {
            empresaId,
            usuarioId,
            perfil,
            data: new Date().toISOString(),
            mensagem: 'Dashboard de comissões - implementar lógica específica'
        };
    }
}