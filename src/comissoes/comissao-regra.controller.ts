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
import { CriarRegraComissaoDto } from './dto/criar-regra-comissao.dto';
import { AuthGuard } from '@nestjs/passport';
import { PerfisEnum } from '../usuario/schemas/usuario.schema';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { ComissaoRegraService } from './comissao-regra.service';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { AtualizarRegraComissaoDto } from './dto/atualizar-regra-comissao.dto';

@ApiTags('Regras de Comissão')
@ApiBearerAuth()
@Controller('comissao-regras')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ComissaoRegraController {
    constructor(private readonly comissaoRegraService: ComissaoRegraService) { }

    /**
     * Criar nova regra de comissão
     */
    @Post()
    @Roles(PerfisEnum.ADM_GERAL, PerfisEnum.GERENTE)
    @ApiOperation({ summary: 'Criar nova regra de comissão' })
    @ApiResponse({ status: 201, description: 'Regra criada com sucesso' })
    @ApiResponse({ status: 400, description: 'Dados inválidos' })
    async criarRegra(
        @Body() dto: CriarRegraComissaoDto,
        @Request() req,
    ) {
        const usuarioId = req.user.id;
        const empresaId = req.user.empresa;
        return await this.comissaoRegraService.criarRegra(dto, usuarioId, empresaId);
    }

    /**
     * Listar todas as regras
     */
    @Get()
    @Roles(PerfisEnum.ADM_GERAL, PerfisEnum.GERENTE)
    @ApiOperation({ summary: 'Listar todas as regras de comissão' })
    @ApiResponse({ status: 200, description: 'Lista de regras retornada com sucesso' })
    async listarRegras(@Request() req) {
        const empresaId = req.user.empresa;
        return await this.comissaoRegraService.listarRegras(empresaId);
    }

    /**
     * Buscar regra por ID
     */
    @Get(':id')
    @Roles(PerfisEnum.ADM_GERAL, PerfisEnum.GERENTE)
    @ApiOperation({ summary: 'Buscar regra de comissão por ID' })
    @ApiResponse({ status: 200, description: 'Regra encontrada' })
    @ApiResponse({ status: 404, description: 'Regra não encontrada' })
    async buscarRegraPorId(@Param('id') id: string, @Request() req) {
        const empresaId = req.user.empresa;
        return await this.comissaoRegraService.buscarRegraPorId(id, empresaId);
    }

    /**
     * Atualizar regra
     */
    @Put(':id')
    @Roles(PerfisEnum.ADM_GERAL, PerfisEnum.GERENTE)
    @ApiOperation({ summary: 'Atualizar regra de comissão' })
    @ApiResponse({ status: 200, description: 'Regra atualizada com sucesso' })
    @ApiResponse({ status: 404, description: 'Regra não encontrada' })
    async atualizarRegra(
        @Param('id') id: string,
        @Body() dto: AtualizarRegraComissaoDto,
        @Request() req,
    ) {
        const usuarioId = req.user.id;
        const empresaId = req.user.empresa;
        return await this.comissaoRegraService.atualizarRegra(id, dto, usuarioId, empresaId);
    }

    /**
     * Excluir regra
     */
    @Delete(':id')
    @Roles(PerfisEnum.ADM_GERAL)
    @ApiOperation({ summary: 'Excluir regra de comissão' })
    @ApiResponse({ status: 200, description: 'Regra excluída com sucesso' })
    @ApiResponse({ status: 404, description: 'Regra não encontrada' })
    @HttpCode(HttpStatus.OK)
    async excluirRegra(@Param('id') id: string, @Request() req) {
        const empresaId = req.user.empresa;
        return await this.comissaoRegraService.excluirRegra(id, empresaId);
    }

    /**
     * Ativar/Desativar regra
     */
    @Put(':id/status')
    @Roles(PerfisEnum.ADM_GERAL, PerfisEnum.GERENTE)
    @ApiOperation({ summary: 'Ativar/Desativar regra de comissão' })
    @ApiResponse({ status: 200, description: 'Status alterado com sucesso' })
    @ApiResponse({ status: 404, description: 'Regra não encontrada' })
    async alterarStatusRegra(
        @Param('id') id: string,
        @Body('ativo') ativo: boolean,
        @Request() req,
    ) {
        const usuarioId = req.user.id;
        const empresaId = req.user.empresa;
        return await this.comissaoRegraService.alterarStatusRegra(id, ativo, usuarioId, empresaId);
    }

    /**
     * Testar aplicação de regras
     */
    @Post('testar')
    @Roles(PerfisEnum.ADM_GERAL, PerfisEnum.GERENTE)
    @ApiOperation({ summary: 'Testar aplicação de regras de comissão' })
    @ApiResponse({ status: 200, description: 'Teste realizado com sucesso' })
    async testarRegras(
        @Body() dadosTeste: {
            tipoNegocio: 'VENDA' | 'ALUGUEL';
            cargo: string;
            nivel?: string;
            valor: number;
        },
        @Request() req,
    ) {
        const empresaId = req.user.empresa;
        return await this.comissaoRegraService.testarRegras(dadosTeste, empresaId);
    }
}