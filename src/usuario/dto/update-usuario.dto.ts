// src/usuario/dto/update-usuario.dto.ts (ATUALIZADO)
import { PartialType } from '@nestjs/mapped-types';
import { CreateUsuarioDto } from './create-usuario.dto';
import { IsOptional, IsString, ValidateNested } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ChavePixDto } from 'src/shared/dto/chave-pix.dto';

export class UpdateUsuarioDto extends PartialType(CreateUsuarioDto) {
    @ApiPropertyOptional({ description: 'Token para push notifications' })
    @IsOptional()
    @IsString()
    pushToken?: string;

    // 🔑 NOVO: Campo para atualizar chave PIX
    @ApiPropertyOptional({ type: ChavePixDto })
    @IsOptional()
    @ValidateNested()
    @Type(() => ChavePixDto)
    chavePix?: ChavePixDto;
}