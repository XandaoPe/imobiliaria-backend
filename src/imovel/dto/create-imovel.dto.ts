// src/imovel/dto/create-imovel.dto.ts
import { IsString, IsNotEmpty, IsNumber, IsEnum, IsBoolean, IsOptional, Min } from 'class-validator';
import { TipoImovel } from '../schemas/imovel.schema';
import { Transform } from 'class-transformer';

export class CreateImovelDto {
    @IsString()
    @IsNotEmpty()
    titulo: string;

    // ⭐️ Adicionar o @Transform para converter o valor para UPPERCASE
    @Transform(({ value }) => String(value).toUpperCase())
    @IsEnum(TipoImovel, { message: `Tipo de imóvel deve ser um dos seguintes: ${Object.values(TipoImovel).join(', ')}` })
    @IsNotEmpty()
    tipo: TipoImovel; // Agora espera-se o tipo em UPPERCASE

    @IsString()
    @IsNotEmpty()
    endereco: string;

    @IsNumber()
    @Min(0)
    @IsNotEmpty()
    valor: number;

    @IsBoolean()
    @IsOptional()
    disponivel?: boolean;

    // ⚠️ NÃO INCLUÍMOS 'empresaId' aqui. Ele será injetado do Token no Service!
}