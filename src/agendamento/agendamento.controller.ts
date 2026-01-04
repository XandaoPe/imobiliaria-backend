// src/agendamento/agendamento.controller.ts
import { Controller, Post, Body, UseGuards, Get, Req, HttpStatus, HttpCode, Put, Patch, Param, Delete, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { PerfisEnum } from 'src/usuario/schemas/usuario.schema';
import { AgendamentoService } from './agendamento.service';
import { CreateAgendamentoDto } from './dto/create-agendamento.dto';
import { UpdateAgendamentoDto } from './dto/update-agendamento.dto';
import { Agendamento } from './schemas/agendamento.schema';
import { UsuarioPayload } from 'src/auth/interfaces/usuario-payload.interface';

export interface RequestWithUser extends Request {
    user: UsuarioPayload;
}

const ROLES_ACESS = [PerfisEnum.CORRETOR, PerfisEnum.GERENTE, PerfisEnum.ADM_GERAL];

@ApiTags('Agendamentos')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('agendamentos')
export class AgendamentoController {
    constructor(private readonly agendamentoService: AgendamentoService) { }

    @Get('check-disponibilidade')
    @Roles(...ROLES_ACESS)
    async check(@Query('data') data: string, @Query('imovelId') imovelId: string) {
        const conflito = await this.agendamentoService.findByDateAndImovel(data, imovelId);
        return {
            disponivel: !conflito,
            mensagem: conflito ? 'Este horário já está ocupado para este imóvel.' : 'Horário livre.'
        };
    }

    @Post()
    @Roles(...ROLES_ACESS)
    @HttpCode(HttpStatus.CREATED)
    create(@Body() createAgendamentoDto: CreateAgendamentoDto, @Req() req: RequestWithUser) {
        return this.agendamentoService.create(createAgendamentoDto, req.user);
    }

    @Get()
    @Roles(...ROLES_ACESS)
    findAll(@Req() req: RequestWithUser) {
        return this.agendamentoService.findAll(req.user.empresa);
    }

    @Get('horarios-ocupados')
    @Roles(...ROLES_ACESS)
    async getOcupados(@Query('imovelId') imovelId: string, @Query('data') data: string) {
        return this.agendamentoService.findHorariosOcupados(imovelId, data);
    }
    
    @Get(':id')
    @Roles(...ROLES_ACESS)
    findOne(@Param('id') id: string, @Req() req: RequestWithUser) {
        return this.agendamentoService.findOne(id, req.user.empresa);
    }

    @Put(':id')
    @Roles(...ROLES_ACESS)
    update(@Param('id') id: string, @Body() updateAgendamentoDto: UpdateAgendamentoDto, @Req() req: RequestWithUser) {
        return this.agendamentoService.update(id, updateAgendamentoDto, req.user.empresa);
    }

    // ⭐️ ROTA PARA ALTERAR STATUS (CANCELAR/CONCLUIR COM MOTIVO)
    @Patch(':id/status')
    @Roles(...ROLES_ACESS)
    @ApiOperation({ summary: 'Altera status do agendamento com um motivo.' })
    updateStatus(
        @Param('id') id: string,
        @Body() body: { status: 'CANCELADO' | 'CONCLUIDO', motivo?: string },
        @Req() req: RequestWithUser
    ) {
        return this.agendamentoService.updateStatus(id, body.status, body.motivo || '', req.user.empresa);
    }

    @Delete(':id')
    @Roles(PerfisEnum.GERENTE, PerfisEnum.ADM_GERAL)
    remove(@Param('id') id: string, @Req() req: RequestWithUser) {
        return this.agendamentoService.remove(id, req.user.empresa);
    }
}