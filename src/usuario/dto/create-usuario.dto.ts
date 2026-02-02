// src/usuario/dto/create-usuario.dto.ts (ATUALIZADO)
import { IsString, IsNotEmpty, IsEmail, IsOptional, IsBoolean, IsEnum, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PerfisEnum } from '../schemas/usuario.schema';
import { Type } from 'class-transformer';
import { ChavePixDto } from 'src/shared/dto/chave-pix.dto';

export class CreateUsuarioDto {
    @ApiProperty({ example: 'joao.silva@email.com' })
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @ApiProperty({ example: 'senha123' })
    @IsString()
    @IsNotEmpty()
    senha: string;

    @ApiProperty({ example: 'João da Silva' })
    @IsString()
    @IsNotEmpty()
    nome: string;

    @ApiPropertyOptional({
        enum: PerfisEnum,
        default: PerfisEnum.CORRETOR,
        example: PerfisEnum.CORRETOR
    })
    @IsEnum(PerfisEnum, { message: 'O perfil deve ser um valor válido: ADM_GERAL, GERENTE, CORRETOR ou SUPORTE' })
    @IsOptional()
    perfil?: PerfisEnum;

    @ApiPropertyOptional({ default: true })
    @IsBoolean()
    @IsOptional()
    ativo?: boolean;

    // 🔑 NOVO: Campo para chave PIX
    @ApiPropertyOptional({ type: ChavePixDto })
    @IsOptional()
    @ValidateNested()
    @Type(() => ChavePixDto)
    chavePix?: ChavePixDto;
}