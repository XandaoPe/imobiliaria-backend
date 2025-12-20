import { Controller, Get, Post, Body, Patch, Param, UseGuards, Request, Query } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('leads')
export class LeadsController {
    constructor(private readonly leadsService: LeadsService) { }

    // ROTA PRIVADA: Apenas contagem de leads novos (Rápida e leve)
    @UseGuards(AuthGuard('jwt'))
    @Get('count')
    async obterContagem(@Request() req) {
        // req.user.empresa extraído do token JWT
        return this.leadsService.countNovos(req.user.empresa);
    }

    // ROTA PÚBLICA: Visitante envia o interesse
    @Post('publico')
    async criar(@Body() createLeadDto: CreateLeadDto) {
        return this.leadsService.create(createLeadDto);
    }

    // ROTA PRIVADA: Imobiliária vê seus leads
    @UseGuards(AuthGuard('jwt'))
    @Get()
    async listar(
        @Request() req,
        @Query('search') search?: string,
        @Query('status') status?: string
    ) {
        // Verifique no console se esses dados chegam ao chamar a rota
        return this.leadsService.findAllByEmpresa(req.user.empresa, search, status);
    }

    // ROTA PRIVADA: Mudar status do lead (ex: 'EM ATENDIMENTO')
    @UseGuards(AuthGuard('jwt'))
    @Patch(':id/status')
    async atualizarStatus(@Param('id') id: string, @Body('status') status: string) {
        return this.leadsService.updateStatus(id, status);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('stats')
    async obterEstatisticas(@Request() req) {
        return this.leadsService.getDashboardStats(req.user.empresa);
    }
    
}