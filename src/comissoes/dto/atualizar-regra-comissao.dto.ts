import { ApiProperty } from '@nestjs/swagger';
import {
    IsString, IsEnum, IsArray, IsNumber, IsOptional,
    IsBoolean, IsDateString, Min, Max
} from 'class-validator';
import { TipoNegocioEnum, TipoCalculoEnum } from './criar-regra-comissao.dto';

export class AtualizarRegraComissaoDto {
    @ApiProperty({ description: 'Nome da regra', required: false })
    @IsString()
    @IsOptional()
    nome?: string;

    @ApiProperty({ enum: TipoNegocioEnum, required: false })
    @IsEnum(TipoNegocioEnum)
    @IsOptional()
    tipoNegocio?: TipoNegocioEnum;

    @ApiProperty({ type: [String], required: false })
    @IsArray()
    @IsOptional()
    @IsString({ each: true })
    cargo?: string[];

    @ApiProperty({ type: [String], required: false })
    @IsArray()
    @IsOptional()
    @IsString({ each: true })
    nivel?: string[];

    @ApiProperty({ description: 'Percentual da comissão (0-100)', required: false })
    @IsNumber()
    @Min(0)
    @Max(100)
    @IsOptional()
    percentual?: number;

    @ApiProperty({ description: 'Valor fixo adicional', required: false })
    @IsNumber()
    @Min(0)
    @IsOptional()
    valorFixo?: number;

    @ApiProperty({ enum: TipoCalculoEnum, required: false })
    @IsEnum(TipoCalculoEnum)
    @IsOptional()
    tipoCalculo?: TipoCalculoEnum;

    @ApiProperty({ description: 'Prioridade', required: false })
    @IsNumber()
    @IsOptional()
    prioridade?: number;

    @ApiProperty({ description: 'Regra ativa?', required: false })
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