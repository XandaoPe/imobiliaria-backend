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

    @ApiPropertyOptional({
        description: 'Status (pode ser múltiplo, separado por vírgula)',
        example: 'PENDENTE,PAGO'
    })
    @IsOptional()
    @IsString()
    status?: string;

    @ApiPropertyOptional({
        description: 'Categoria (pode ser múltipla, separada por vírgula)',
        example: 'COMISSAO,REPASSE'
    })
    @IsOptional()
    @IsString()
    categoria?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    dataInicio?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    dataFim?: string;

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

    @ApiPropertyOptional({ description: 'Código do Imóvel' })
    @IsOptional()
    @IsString()
    imovelCodigo?: string;

    @ApiPropertyOptional({ description: 'Código da Negociação' })
    @IsOptional()
    @IsString()
    negociacaoCodigo?: string;

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