// src/shared/dto/chave-pix.dto.ts
import { IsEnum, IsString, IsBoolean, IsOptional, IsEmail, Matches, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum TipoChavePix {
    CPF = 'CPF',
    CNPJ = 'CNPJ',
    EMAIL = 'EMAIL',
    TELEFONE = 'TELEFONE',
    CHAVE_ALEATORIA = 'CHAVE_ALEATORIA'
}

export class ChavePixDto {
    @ApiProperty({
        enum: TipoChavePix,
        description: 'Tipo da chave PIX',
        example: TipoChavePix.EMAIL
    })
    @IsEnum(TipoChavePix)
    tipo: TipoChavePix;

    @ApiProperty({
        description: 'Valor da chave PIX',
        example: 'joao.silva@email.com'
    })
    @IsString()
    @ValidateIf(o => o.tipo === TipoChavePix.EMAIL)
    @IsEmail({}, { message: 'Para chave do tipo EMAIL, forneça um e-mail válido' })
    @ValidateIf(o => o.tipo === TipoChavePix.CPF)
    @Matches(/^\d{11}$/, { message: 'Para chave do tipo CPF, forneça um CPF válido (11 dígitos)' })
    @ValidateIf(o => o.tipo === TipoChavePix.CNPJ)
    @Matches(/^\d{14}$/, { message: 'Para chave do tipo CNPJ, forneça um CNPJ válido (14 dígitos)' })
    @ValidateIf(o => o.tipo === TipoChavePix.TELEFONE)
    @Matches(/^\+\d{2}\d{10,11}$/, { message: 'Para chave do tipo TELEFONE, use formato +5511999999999' })
    chave: string;

    @ApiPropertyOptional({
        default: false,
        description: 'Indica se a chave já foi validada'
    })
    @IsOptional()
    @IsBoolean()
    validado?: boolean = false;

    @ApiPropertyOptional({
        default: false,
        description: 'Indica se esta é a chave preferencial (pode ter várias)'
    })
    @IsOptional()
    @IsBoolean()
    preferencial?: boolean = false;
}

export class ValidarChavePixDto {
    @ApiProperty({
        description: 'Código de validação enviado por e-mail/SMS',
        example: '123456'
    })
    @IsString()
    codigoValidacao: string;
}

export class ListaChavesPixDto {
    @ApiProperty({ type: [ChavePixDto] })
    @Type(() => ChavePixDto)
    chaves: ChavePixDto[];
}