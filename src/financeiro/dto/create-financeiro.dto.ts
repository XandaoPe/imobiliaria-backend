import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, IsEnum, IsOptional, IsDateString } from 'class-validator';
import { TipoLancamento } from '../schemas/financeiro.schema';

export class CreateFinanceiroDto {
    @ApiProperty({ example: 'Aluguel Unidade 101' })
    @IsString()
    @IsNotEmpty()
    descricao: string;

    @ApiProperty({ example: 1500.50 })
    @IsNumber()
    valor: number;

    @ApiProperty({ example: '2026-01-20' })
    @IsDateString()
    dataVencimento: string;

    @ApiProperty({ enum: TipoLancamento })
    @IsEnum(TipoLancamento)
    tipo: TipoLancamento;

    @ApiProperty({ example: 'ALUGUEL' })
    @IsString()
    @IsNotEmpty()
    categoria: string;

    @ApiPropertyOptional({ example: 'PENDENTE', enum: ['PENDENTE', 'PAGO', 'CANCELADO'], default: 'PENDENTE' })
    @IsOptional()
    @IsString()
    status?: string;

    @ApiPropertyOptional({ description: 'ID do Imóvel vinculado' })
    @IsOptional()
    @IsString()
    imovel?: string;

    @ApiPropertyOptional({ description: 'ID do Cliente vinculado' })
    @IsOptional()
    @IsString()
    cliente?: string;
}