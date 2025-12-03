// src/relatorios/relatorios.controller.ts
import { Controller, Get, UseGuards, Req, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { PerfisEnum } from 'src/usuario/schemas/usuario.schema'; // ⭐️ Usando PerfisEnum
import { RelatoriosService } from './relatorios.service';
import { UsuarioPayload } from 'src/auth/interfaces/usuario-payload.interface';

export interface RequestWithUser extends Request {
    user: UsuarioPayload;
}

@ApiTags('Relatórios e Consultas')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('relatorios')
export class RelatoriosController {
    constructor(private readonly relatoriosService: RelatoriosService) { }

    @Get('agendamentos-por-status')
    // ⭐️ Regra: Apenas perfis de gestão podem acessar relatórios
    @Roles(PerfisEnum.GERENTE, PerfisEnum.ADM_GERAL)
    @ApiOperation({ summary: 'Relatório: Contagem de agendamentos por status no último mês.' })
    async getAgendamentosPorStatus(@Req() req: RequestWithUser) {
        return this.relatoriosService.getAgendamentosPorStatus(req.user.empresa);
    }

    @Get('imoveis-sem-foto')
    @Roles(PerfisEnum.GERENTE, PerfisEnum.ADM_GERAL)
    @ApiOperation({ summary: 'Busca: Imóveis ativos que não possuem nenhuma foto cadastrada.' })
    async getImoveisSemFoto(@Req() req: RequestWithUser) {
        return this.relatoriosService.getImoveisSemFoto(req.user.empresa);
    }
}