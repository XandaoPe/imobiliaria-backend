// src/configuracao/dto/create-configuracao.dto.ts
import { IsString, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateConfiguracaoDto {
    @ApiProperty({ example: 'TAXA_VENDA' })
    @IsString()
    chave: string;

    @ApiProperty({ example: 6.0 })
    @IsNumber()
    valor: number;

    @ApiProperty({ example: 'percentual', required: false })
    @IsString()
    @IsOptional()
    tipo?: string;
}
