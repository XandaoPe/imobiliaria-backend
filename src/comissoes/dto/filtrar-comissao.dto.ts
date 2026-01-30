import { ApiProperty } from '@nestjs/swagger';
import {
    IsString, IsEnum, IsNumber, IsOptional,
    IsBoolean, IsDateString
} from 'class-validator';
import { Transform } from 'class-transformer';

export class FiltrarComissaoDto {
    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    usuarioId?: string;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    financeiroId?: string;

    @ApiProperty({
        enum: ['PENDENTE', 'APROVADA', 'PAGA', 'CANCELADA'],
        required: false
    })
    @IsEnum(['PENDENTE', 'APROVADA', 'PAGA', 'CANCELADA'])
    @IsOptional()
    status?: string;

    @ApiProperty({
        enum: ['VENDA', 'ALUGUEL'],
        required: false
    })
    @IsEnum(['VENDA', 'ALUGUEL'])
    @IsOptional()
    tipoNegocio?: string;

    @ApiProperty({ required: false })
    @IsDateString()
    @IsOptional()
    dataInicio?: string;

    @ApiProperty({ required: false })
    @IsDateString()
    @IsOptional()
    dataFim?: string;

    @ApiProperty({
        description: 'Página atual (para paginação)',
        default: 1,
        required: false
    })
    @Transform(({ value }) => parseInt(value))
    @IsNumber()
    @IsOptional()
    pagina?: number = 1;

    @ApiProperty({
        description: 'Itens por página',
        default: 20,
        required: false
    })
    @Transform(({ value }) => parseInt(value))
    @IsNumber()
    @IsOptional()
    limite?: number = 20;
}