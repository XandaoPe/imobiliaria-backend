// src/cliente/dto/create-cliente.dto.ts (ATUALIZADO)
import { IsString, IsEmail, IsOptional, IsEnum, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ChavePixDto } from 'src/shared/dto/chave-pix.dto';

export class CreateClienteDto {
    @ApiProperty({ example: 'Maria Santos' })
    @IsString()
    nome: string;

    @ApiProperty({ example: '12345678901' })
    @IsString()
    cpf: string;

    @ApiPropertyOptional({ example: '(11) 99999-9999' })
    @IsString()
    @IsOptional()
    telefone?: string;

    @ApiProperty({ example: 'maria.santos@email.com' })
    @IsEmail()
    email: string;

    @ApiPropertyOptional({ example: 'ATIVO', enum: ['ATIVO', 'INATIVO'] })
    @IsString()
    @IsOptional()
    @IsEnum(['ATIVO', 'INATIVO'])
    status?: string;

    @ApiPropertyOptional({ example: 'Comprador/Vendedor' })
    @IsString()
    @IsOptional()
    perfil?: string;

    @ApiPropertyOptional({ example: 'Cliente preferencial' })
    @IsString()
    @IsOptional()
    observacoes?: string;

    @ApiPropertyOptional({ example: 'Rua das Flores, 123' })
    @IsString()
    @IsOptional()
    endereco?: string;

    @ApiPropertyOptional({ example: 'São Paulo' })
    @IsString()
    @IsOptional()
    cidade?: string;

    // 🔑 NOVO: Campo para chave PIX
    @ApiPropertyOptional({ type: ChavePixDto })
    @IsOptional()
    @ValidateNested()
    @Type(() => ChavePixDto)
    chavePix?: ChavePixDto;
}