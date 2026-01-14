import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsString } from 'class-validator';
import { TipoLancamento } from '../schemas/financeiro.schema';

export class FinanceiroFiltrosDto {
    @ApiPropertyOptional({
        description: 'Termo de busca para filtrar por descrição ou código da negociação'
    })
    @IsOptional()
    @IsString()
    search?: string; // Adicionado este campo para habilitar a busca global

    @ApiPropertyOptional({ enum: TipoLancamento })
    @IsOptional()
    @IsEnum(TipoLancamento)
    tipo?: TipoLancamento;

    @ApiPropertyOptional({
        example: 'PENDENTE',
        enum: ['PENDENTE', 'PAGO', 'CANCELADO', 'ATRASADO']
    })
    @IsOptional()
    @IsString()
    status?: string;

    @ApiPropertyOptional({ description: 'Data de início no formato YYYY-MM-DD' })
    @IsOptional()
    @IsString()
    dataInicio?: string;

    @ApiPropertyOptional({ description: 'Data de fim no formato YYYY-MM-DD' })
    @IsOptional()
    @IsString()
    dataFim?: string;
}