import { Controller, Get, Post, Body, Patch, Param, UseGuards, Request, Query } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('leads')
export class LeadsController {
    constructor(private readonly leadsService: LeadsService) { }

    @UseGuards(AuthGuard('jwt'))
    @Get('count')
    async obterContagem(@Request() req) {
        return this.leadsService.countNovos(req.user.empresa);
    }

    @Post('publico')
    async criar(@Body() createLeadDto: CreateLeadDto) {
        return this.leadsService.create(createLeadDto);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get()
    async listar(
        @Request() req,
        @Query('search') search?: string,
        @Query('status') status?: string
    ) {
        return this.leadsService.findAllByEmpresa(req.user.empresa, search, status);
    }

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

    /**
     * WEBHOOK CORRIGIDO
     * Não precisamos injetar usuarioService aqui, pois o LeadsService.create 
     * já faz o disparo das notificações que configuramos no passo anterior.
     */
    @Post('webhook/zap')
    async receberLeadZap(@Body() data: any) {
        // Mapeia os dados do portal para o formato que o seu Service espera
        return this.leadsService.create({
            nome: data.contact?.name || data.lead?.name || 'Lead sem nome',
            contato: data.contact?.email || data.lead?.email || data.contact?.phone,
            empresa: data.empresaId, // ID que você configurará na URL do webhook no portal
            imovel: data.imovelId,   // ID do imóvel vindo do portal
        });
    }
}