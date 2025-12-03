// src/agendamento/agendamento.controller.ts
import { Controller, Post, Body, UseGuards, Get, Req, HttpStatus, HttpCode, Put, Param, Delete } from '@nestjs/common';
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

    // ⭐️ CREATE
    @Post()
    @Roles(...ROLES_ACESS)
    @ApiOperation({ summary: 'Cria um novo agendamento de visita (Apenas Corretor/Gerente/ADM).' })
    @HttpCode(HttpStatus.CREATED)
    create(
        @Body() createAgendamentoDto: CreateAgendamentoDto,
        @Req() req: RequestWithUser,
    ): Promise<Agendamento> {
        return this.agendamentoService.create(createAgendamentoDto, req.user);
    }

    // ⭐️ FIND ALL
    @Get()
    @Roles(...ROLES_ACESS)
    @ApiOperation({ summary: 'Lista todos os agendamentos da empresa.' })
    findAll(@Req() req: RequestWithUser): Promise<Agendamento[]> {
        return this.agendamentoService.findAll(req.user.empresa);
    }

    // ⭐️ FIND ONE
    @Get(':id')
    @Roles(...ROLES_ACESS)
    @ApiOperation({ summary: 'Busca um agendamento por ID (Multitenancy).' })
    findOne(@Param('id') id: string, @Req() req: RequestWithUser): Promise<Agendamento> {
        return this.agendamentoService.findOne(id, req.user.empresa);
    }

    // ⭐️ UPDATE
    @Put(':id')
    @Roles(...ROLES_ACESS)
    @ApiOperation({ summary: 'Atualiza um agendamento por ID (Multitenancy).' })
    update(
        @Param('id') id: string,
        @Body() updateAgendamentoDto: UpdateAgendamentoDto,
        @Req() req: RequestWithUser,
    ): Promise<Agendamento> {
        return this.agendamentoService.update(id, updateAgendamentoDto, req.user.empresa);
    }

    // ⭐️ DELETE
    @Delete(':id')
    @Roles(PerfisEnum.GERENTE, PerfisEnum.ADM_GERAL) // Restringir a deleção a perfis superiores
    @ApiOperation({ summary: 'Remove um agendamento por ID (Apenas Gerente/ADM).' })
    remove(@Param('id') id: string, @Req() req: RequestWithUser): Promise<{ message: string }> {
        return this.agendamentoService.remove(id, req.user.empresa);
    }
}