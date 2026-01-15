import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { TipoLancamento } from '../schemas/financeiro.schema';

export class FinanceiroFiltrosDto {
    @ApiPropertyOptional({ description: 'Termo de busca' })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({ enum: TipoLancamento })
    @IsOptional()
    @IsEnum(TipoLancamento)
    tipo?: TipoLancamento;

    @ApiPropertyOptional({ example: 'PENDENTE' })
    @IsOptional()
    @IsString()
    status?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    dataInicio?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    dataFim?: string;

    // --- Novos campos para Paginação ---
    @ApiPropertyOptional({ default: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional({ default: 10 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    limit?: number = 10;
    
}