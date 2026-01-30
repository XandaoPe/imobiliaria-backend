import { ApiProperty } from '@nestjs/swagger';
import {
    IsString, IsEnum, IsArray, IsNumber, IsOptional,
    IsBoolean, IsDateString, Min, Max
} from 'class-validator';
import { CargoRegra, NivelRegra, TipoCalculoRegra, TipoNegocioRegra } from '../schemas/comissaoRegra.schema';

export enum TipoNegocioEnum {
    VENDA = 'VENDA',
    ALUGUEL = 'ALUGUEL',
    AMBOS = 'AMBOS',
}

export enum TipoCalculoEnum {
    PERCENTUAL = 'PERCENTUAL',
    FIXO = 'FIXO',
    MISTO = 'MISTO',
}

export class CriarRegraComissaoDto {
    @ApiProperty({ description: 'Nome da regra (ex: "Corretor Sênior - Venda")' })
    @IsString()
    nome: string;

    @ApiProperty({ enum: TipoNegocioRegra })
    @IsEnum(TipoNegocioRegra)
    tipoNegocio: TipoNegocioRegra;

    @ApiProperty({ type: [String], required: false })
    @IsArray()
    @IsOptional()
    @IsEnum(CargoRegra, { each: true })
    cargo?: CargoRegra[];

    @ApiProperty({ type: [String], required: false })
    @IsArray()
    @IsOptional()
    @IsEnum(NivelRegra, { each: true })
    nivel?: NivelRegra[];

    @ApiProperty({ enum: TipoCalculoRegra })
    @IsEnum(TipoCalculoRegra)
    tipoCalculo: TipoCalculoRegra;

    @ApiProperty({ description: 'Percentual da comissão (0-100)' })
    @IsNumber()
    @Min(0)
    @Max(100)
    percentual: number;

    @ApiProperty({ description: 'Valor fixo adicional', required: false })
    @IsNumber()
    @Min(0)
    @IsOptional()
    valorFixo?: number;

    @ApiProperty({ description: 'Prioridade (maior número = maior prioridade)' })
    @IsNumber()
    prioridade: number;

    @ApiProperty({ description: 'Regra ativa?', default: true })
    @IsBoolean()
    @IsOptional()
    ativo?: boolean;

    @ApiProperty({ description: 'Data de início da vigência', required: false })
    @IsDateString()
    @IsOptional()
    dataInicio?: string;

    @ApiProperty({ description: 'Data de fim da vigência', required: false })
    @IsDateString()
    @IsOptional()
    dataFim?: string;

    @ApiProperty({ description: 'Observações', required: false })
    @IsString()
    @IsOptional()
    observacao?: string;
}