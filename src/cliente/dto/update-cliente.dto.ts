// src/cliente/dto/update-cliente.dto.ts (ATUALIZADO)
import { PartialType } from '@nestjs/mapped-types';
import { CreateClienteDto } from './create-cliente.dto';
import { ValidateNested, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ChavePixDto } from 'src/shared/dto/chave-pix.dto';

export class UpdateClienteDto extends PartialType(CreateClienteDto) {
    // 🔑 NOVO: Campo para atualizar chave PIX
    @ApiPropertyOptional({ type: ChavePixDto })
    @IsOptional()
    @ValidateNested()
    @Type(() => ChavePixDto)
    chavePix?: ChavePixDto;
}