import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsString, IsEnum, IsDateString, IsArray, ValidateNested } from 'class-validator';
import { TipoLancamento, CategoriaLancamento, StatusFinanceiro } from '../schemas/financeiro.schema';
import { Type } from 'class-transformer';
import { ComissaoDto } from './create-financeiro.dto';

export class UpdateFinanceiroDto {
    @ApiPropertyOptional({ example: 'Aluguel Unidade 101 atualizado' })
    @IsOptional()
    @IsString()
    descricao?: string;

    @ApiPropertyOptional({ example: 1600.50 })
    @IsOptional()
    @IsNumber()
    valor?: number;

    @ApiPropertyOptional({ example: '2026-02-20' })
    @IsOptional()
    @IsDateString()
    dataVencimento?: string;

    @ApiPropertyOptional({ enum: TipoLancamento })
    @IsOptional()
    @IsEnum(TipoLancamento)
    tipo?: TipoLancamento;

    @ApiPropertyOptional({ enum: CategoriaLancamento })
    @IsOptional()
    @IsEnum(CategoriaLancamento)
    categoria?: CategoriaLancamento;

    @ApiPropertyOptional({ enum: StatusFinanceiro })
    @IsOptional()
    @IsEnum(StatusFinanceiro)
    status?: StatusFinanceiro;

    @ApiPropertyOptional({ example: '2026-02-15' })
    @IsOptional()
    @IsDateString()
    dataPagamento?: string;

    @ApiPropertyOptional({ example: 1600.50 })
    @IsOptional()
    @IsNumber()
    valorPago?: number;

    @ApiPropertyOptional({ description: 'ID do Imóvel vinculado' })
    @IsOptional()
    @IsString()
    imovel?: string;

    @ApiPropertyOptional({ description: 'ID do Cliente/Usuário vinculado' })
    @IsOptional()
    @IsString()
    cliente?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    observacoes?: string;

    @ApiPropertyOptional({ description: 'Número da parcela' })
    @IsOptional()
    @IsNumber()
    parcelaNumero?: number;

    @ApiPropertyOptional({ description: 'Lista de comissões para distribuição' })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ComissaoDto)
    comissoes?: ComissaoDto[];
}