import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { TipoLancamento, CategoriaLancamento } from '../schemas/financeiro.schema';

export class FinanceiroFiltrosDto {
    @ApiPropertyOptional({ description: 'Termo de busca' })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({ enum: TipoLancamento })
    @IsOptional()
    @IsEnum(TipoLancamento)
    tipo?: TipoLancamento;

    @ApiPropertyOptional({ enum: CategoriaLancamento })
    @IsOptional()
    @IsEnum(CategoriaLancamento)
    categoria?: CategoriaLancamento;

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

    // --- Novos campos para valor mínimo/máximo ---
    @ApiPropertyOptional({ description: 'Valor mínimo' })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    valorMin?: number;

    @ApiPropertyOptional({ description: 'Valor máximo' })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    valorMax?: number;

    // --- Novos campos para Imóvel ---
    @ApiPropertyOptional({ description: 'Código do Imóvel' })
    @IsOptional()
    @IsString()
    imovelCodigo?: string;

    // --- Novos campos para Negociação ---
    @ApiPropertyOptional({ description: 'Código da Negociação' })
    @IsOptional()
    @IsString()
    negociacaoCodigo?: string;

    // --- Campos para Paginação ---
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