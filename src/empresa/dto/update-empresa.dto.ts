// src/empresa/dto/update-empresa.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateEmpresaDto } from './create-empresa.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ChavePixEmpresaDto {
    @ApiPropertyOptional({ enum: ['CNPJ', 'EMAIL', 'TELEFONE', 'CHAVE_ALEATORIA'] })
    @IsOptional()
    @IsEnum(['CNPJ', 'EMAIL', 'TELEFONE', 'CHAVE_ALEATORIA'])
    tipo?: 'CNPJ' | 'EMAIL' | 'TELEFONE' | 'CHAVE_ALEATORIA';

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    chave?: string;

    @ApiPropertyOptional({ default: true })
    @IsOptional()
    preferencial?: boolean;
}
export class UpdateEmpresaDto extends PartialType(CreateEmpresaDto) { 

    @ApiPropertyOptional({ type: ChavePixEmpresaDto })
    @IsOptional()
    @ValidateNested()
    @Type(() => ChavePixEmpresaDto)
    chavePix?: ChavePixEmpresaDto;

    @ApiPropertyOptional({ type: [String] })
    @IsOptional()
    @IsString({ each: true })
    chavesPixAlternativas?: string[];

    // 🔑 NOVO: Dados bancários
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    banco?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    agencia?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    conta?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    tipoConta?: string;
}
