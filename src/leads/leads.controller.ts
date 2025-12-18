import { Controller, Get, Post, Body, Patch, Param, UseGuards, Request } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('leads')
export class LeadsController {
    constructor(private readonly leadsService: LeadsService) { }

    // ROTA PÚBLICA: Visitante envia o interesse
    @Post('publico')
    async criar(@Body() createLeadDto: CreateLeadDto) {
        return this.leadsService.create(createLeadDto);
    }

    // ROTA PRIVADA: Imobiliária vê seus leads
    @UseGuards(AuthGuard('jwt'))
    @Get()
    async listar(@Request() req) {
        // Pegamos o ID da empresa do token do usuário logado
        return this.leadsService.findAllByEmpresa(req.user.empresa);
    }

    // ROTA PRIVADA: Mudar status do lead (ex: 'EM ATENDIMENTO')
    @UseGuards(AuthGuard('jwt'))
    @Patch(':id/status')
    async atualizarStatus(@Param('id') id: string, @Body('status') status: string) {
        return this.leadsService.updateStatus(id, status);
    }
}