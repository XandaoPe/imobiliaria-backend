import { IsString, IsNotEmpty, IsEnum, IsOptional, IsNumber, IsBoolean, Min, ValidateIf } from 'class-validator';
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

    // ⭐️ CAMPOS DE CHECKBOX
    @IsBoolean()
    @IsOptional()
    para_venda?: boolean;

    @IsBoolean()
    @IsOptional()
    para_aluguel?: boolean;

    // ⭐️ VALOR DE VENDA (obrigatório apenas se para_venda = true)
    @IsNumber()
    @Min(0, { message: 'O valor de venda deve ser maior ou igual a 0' })
    @ValidateIf((o) => o.para_venda === true)
    @IsNotEmpty({ message: 'Valor de venda é obrigatório quando "Para Venda" está marcado' })
    valor_venda?: number;

    // ⭐️ VALOR DE ALUGUEL (obrigatório apenas se para_aluguel = true)
    @IsNumber()
    @Min(0, { message: 'O valor de aluguel deve ser maior ou igual a 0' })
    @ValidateIf((o) => o.para_aluguel === true)
    @IsNotEmpty({ message: 'Valor de aluguel é obrigatório quando "Para Aluguel" está marcado' })
    valor_aluguel?: number;

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