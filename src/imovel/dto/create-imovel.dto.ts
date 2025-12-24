import { IsString, IsNotEmpty, IsEnum, IsOptional, IsNumber, IsBoolean, Min } from 'class-validator';
import { TipoImovel } from '../schemas/imovel.schema';

export class CreateImovelDto {
    @IsString()
    @IsNotEmpty({ message: 'O título é obrigatório' })
    titulo: string;

    @IsEnum(TipoImovel, { message: 'Tipo de imóvel inválido' })
    @IsNotEmpty({ message: 'O tipo é obrigatório' })
    tipo: TipoImovel;

    @IsString()
    @IsNotEmpty({ message: 'O endereço é obrigatório' })
    endereco: string;

    @IsString()
    @IsNotEmpty({ message: 'A cidade é obrigatória' })
    cidade: string;

    @IsNumber()
    @IsOptional()
    valor?: number;

    @IsNumber()
    @IsOptional()
    aluguel?: number;

    @IsBoolean()
    @IsOptional()
    disponivel?: boolean;

    @IsString()
    @IsOptional()
    descricao?: string;

    @IsString()
    @IsOptional()
    detalhes?: string;

    @IsNumber()
    @IsOptional()
    quartos?: number;

    @IsNumber()
    @IsOptional()
    banheiros?: number;

    @IsNumber()
    @IsOptional()
    area_terreno?: number;

    @IsNumber()
    @IsOptional()
    area_construida?: number;

    @IsBoolean()
    @IsOptional()
    garagem?: boolean;
}