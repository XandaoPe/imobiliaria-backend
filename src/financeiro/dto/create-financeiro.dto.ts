import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, IsEnum, IsOptional, IsDateString, IsArray, ValidateNested } from 'class-validator';
import { TipoLancamento } from '../schemas/financeiro.schema';
import { Type } from 'class-transformer';

export class ComissaoDto {
    @ApiProperty({ description: 'ID da regra de comissão' })
    @IsString()
    @IsNotEmpty()
    regraId: string;

    @ApiProperty({ description: 'ID do usuário (corretor)' })
    @IsString()
    @IsNotEmpty()
    usuarioId: string;

    @ApiProperty({ description: 'Nome do usuário' })
    @IsString()
    usuarioNome: string;

    @ApiProperty({ description: 'Percentual da comissão' })
    @IsNumber()
    percentual: number;

    @ApiPropertyOptional({ description: 'Valor fixo da comissão' })
    @IsOptional()
    @IsNumber()
    valorFixo?: number;

    @ApiProperty({ description: 'Valor calculado da comissão' })
    @IsNumber()
    valorCalculado: number;

    @ApiProperty({ description: 'Tipo de cálculo' })
    @IsString()
    tipoCalculo: string;

    @ApiProperty({ description: 'Nome da regra' })
    @IsString()
    regraNome: string;
}

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

    @ApiPropertyOptional({ description: 'ID do Cliente/Usuário vinculado' })
    @IsOptional()
    @IsString()
    cliente?: string;

    @ApiPropertyOptional({ description: 'Lista de comissões para distribuição' })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ComissaoDto)
    comissoes?: ComissaoDto[];
}