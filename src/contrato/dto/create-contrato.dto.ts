// src/contrato/dto/create-contrato.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty, IsNumber, IsEnum, IsString, IsOptional, Min } from 'class-validator';
import { TipoContrato, StatusContrato } from '../schemas/contrato.schema';

export class CreateContratoDto {
    @ApiProperty({ description: 'ID do imóvel envolvido no contrato.' })
    @IsMongoId({ message: 'O Imovel ID deve ser um ID válido do Mongo.' })
    imovelId: string;

    @ApiProperty({ description: 'ID do cliente envolvido no contrato.' })
    @IsMongoId({ message: 'O Cliente ID deve ser um ID válido do Mongo.' })
    clienteId: string;

    @ApiProperty({ description: 'Tipo do contrato (VENDA ou LOCACAO).', enum: TipoContrato })
    @IsEnum(TipoContrato)
    tipo: TipoContrato;

    @ApiProperty({ description: 'Valor total acordado no contrato.' })
    @IsNumber()
    @Min(0)
    valorTotal: number;

    @ApiProperty({ description: 'Observações adicionais do contrato.', required: false })
    @IsOptional()
    @IsString()
    observacoes?: string;

    @ApiProperty({ description: 'Status inicial do contrato.', enum: StatusContrato, default: StatusContrato.RASCUNHO, required: false })
    @IsOptional()
    @IsEnum(StatusContrato)
    status?: StatusContrato;
}