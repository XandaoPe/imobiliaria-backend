// src/pix/controllers/pix.controller.ts
import {
    Controller,
    Post,
    Get,
    Body,
    Param,
    Query,
    Req,
    UseGuards,
    HttpCode,
    HttpStatus,
    Patch,
    Delete
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PerfisEnum } from '../usuario/schemas/usuario.schema';

import { PixService } from './pix.service';
import { GerarQrCodePixDto, ConsultarPagamentoPixDto, ReenviarQrCodePixDto, CancelarQrCodePixDto } from './dto/gerar-qrcode-pix.dto';
import { StatusTransacaoPix } from './schemas/transacao-pix.schema';

interface RequestWithUser extends Request {
    user: {
        id: string;
        empresa: string;
        perfil: string;
    };
}

@ApiTags('PIX')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('pix')
export class PixController {
    constructor(private readonly pixService: PixService) { }

    @Post('gerar-qrcode')
    @Roles(PerfisEnum.ADM_GERAL, PerfisEnum.GERENTE, PerfisEnum.CORRETOR)
    @ApiOperation({ summary: 'Gera QR Code PIX para um lançamento financeiro' })
    async gerarQrCodePix(
        @Body() gerarQrCodeDto: GerarQrCodePixDto,
        @Req() req: RequestWithUser
    ) {
        const usuarioId = req.user.id;
        const empresaId = req.user.empresa;

        return this.pixService.gerarQrCodePix(gerarQrCodeDto, empresaId, usuarioId);
    }

    @Get('transacoes')
    @Roles(PerfisEnum.ADM_GERAL, PerfisEnum.GERENTE)
    @ApiOperation({ summary: 'Lista todas as transações PIX da empresa' })
    @ApiQuery({ name: 'status', required: false, enum: StatusTransacaoPix })
    @ApiQuery({ name: 'dataInicio', required: false, type: String })
    @ApiQuery({ name: 'dataFim', required: false, type: String })
    @ApiQuery({ name: 'limit', required: false, type: Number, default: 50 })
    async listarTransacoes(
        @Req() req: RequestWithUser,
        @Query('status') status?: StatusTransacaoPix,
        @Query('dataInicio') dataInicio?: string,
        @Query('dataFim') dataFim?: string,
        @Query('limit') limit?: number
    ) {
        const empresaId = req.user.empresa;

        return this.pixService.listarTransacoesPorEmpresa(empresaId, {
            status,
            dataInicio,
            dataFim,
            limit
        });
    }

    @Get('transacoes/:id')
    @Roles(PerfisEnum.ADM_GERAL, PerfisEnum.GERENTE, PerfisEnum.CORRETOR)
    @ApiOperation({ summary: 'Busca uma transação PIX por ID' })
    async buscarTransacao(
        @Param('id') id: string,
        @Req() req: RequestWithUser
    ) {
        const empresaId = req.user.empresa;

        return this.pixService.buscarTransacaoPorId(id, empresaId);
    }

    @Post('transacoes/:id/consultar')
    @Roles(PerfisEnum.ADM_GERAL, PerfisEnum.GERENTE)
    @ApiOperation({ summary: 'Consulta status de pagamento de uma transação PIX' })
    async consultarPagamento(
        @Param('id') id: string,
        @Req() req: RequestWithUser
    ) {
        const empresaId = req.user.empresa;
        const transacao = await this.pixService.buscarTransacaoPorId(id, empresaId);

        // TODO: Implementar integração com API de consulta PIX
        // Por enquanto, retorna o status atual

        return {
            transacaoId: id,
            status: transacao.status,
            dataConsulta: new Date().toISOString(),
            mensagem: 'Consulta realizada com sucesso'
        };
    }

    @Post('transacoes/:id/reenviar')
    @Roles(PerfisEnum.ADM_GERAL, PerfisEnum.GERENTE, PerfisEnum.CORRETOR)
    @ApiOperation({ summary: 'Reenvia QR Code PIX (gera novo com mesma transação)' })
    async reenviarQrCode(
        @Param('id') id: string,
        @Req() req: RequestWithUser
    ) {
        const empresaId = req.user.empresa;

        return this.pixService.reenviarQrCode(id, empresaId);
    }

    @Delete('transacoes/:id/cancelar')
    @Roles(PerfisEnum.ADM_GERAL, PerfisEnum.GERENTE)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Cancela uma transação PIX' })
    async cancelarTransacao(
        @Param('id') id: string,
        @Body() cancelarDto: CancelarQrCodePixDto,
        @Req() req: RequestWithUser
    ) {
        const empresaId = req.user.empresa;

        return this.pixService.cancelarTransacao(id, empresaId, cancelarDto.motivo);
    }

    // Método corrigido - linha 115-130
    @Patch('transacoes/:id/status')
    @Roles(PerfisEnum.ADM_GERAL, PerfisEnum.GERENTE)
    @ApiOperation({ summary: 'Atualiza status de uma transação PIX (manual)' })
    async atualizarStatus(
        @Param('id') id: string,
        @Req() req: RequestWithUser, // ⬅️ MOVIDO para antes dos parâmetros opcionais
        @Body('status') status: StatusTransacaoPix,
        @Body('observacoes') observacoes?: string // ⬅️ Agora é o último parâmetro
    ) {
        const empresaId = req.user.empresa;

        return this.pixService.atualizarStatusTransacao(
            id,
            empresaId,
            status,
            { observacoes }
        );
    }

    @Get('estatisticas')
    @Roles(PerfisEnum.ADM_GERAL, PerfisEnum.GERENTE)
    @ApiOperation({ summary: 'Obtém estatísticas de transações PIX' })
    async obterEstatisticas(@Req() req: RequestWithUser) {
        const empresaId = req.user.empresa;

        return this.pixService.obterEstatisticas(empresaId);
    }

    @Post('verificar-expiradas')
    @Roles(PerfisEnum.ADM_GERAL)
    @ApiOperation({ summary: 'Verifica e atualiza transações PIX expiradas' })
    async verificarExpiradas(@Req() req: RequestWithUser) {
        const empresaId = req.user.empresa;
        const quantidade = await this.pixService.verificarTransacoesExpiradas(empresaId);

        return {
            mensagem: `Transações expiradas verificadas: ${quantidade} atualizadas`,
            quantidade
        };
    }
}