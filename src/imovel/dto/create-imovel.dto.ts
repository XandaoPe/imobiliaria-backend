import { IsString, IsNotEmpty, IsNumber, IsEnum, IsBoolean, IsOptional, Min, IsInt } from 'class-validator';
import { TipoImovel } from '../schemas/imovel.schema';
import { Transform } from 'class-transformer';

export class CreateImovelDto {
    // === CAMPOS OBRIGATÓRIOS ===
    @IsString()
    @IsNotEmpty()
    titulo: string;

    @Transform(({ value }) => String(value).toUpperCase())
    @IsEnum(TipoImovel, { message: `Tipo de imóvel deve ser um dos seguintes: ${Object.values(TipoImovel).join(', ')}` })
    @IsNotEmpty()
    tipo: TipoImovel;

    @IsString()
    @IsNotEmpty()
    endereco: string;

    @IsNumber()
    @Min(0)
    @IsNotEmpty()
    valor: number;

    // === CAMPOS OPCIONAIS (Garantindo que venham como null se vazios) ===

    @IsBoolean()
    @IsOptional()
    disponivel?: boolean;

    @IsString()
    @IsOptional()
    // ⭐️ CORREÇÃO: Transforma string vazia para null (para consistência)
    @Transform(({ value }) => (value === '' ? null : value))
    cidade?: string | null;

    @IsString()
    @IsOptional()
    @Transform(({ value }) => (value === '' ? null : value))
    descricao?: string | null;

    @IsString()
    @IsOptional()
    @Transform(({ value }) => (value === '' ? null : value))
    detalhes?: string | null;

    @IsInt() // Garante que seja um número inteiro
    @IsOptional()
    @Min(0)
    @Transform(({ value }) => {
        // Se for string vazia, undefined ou null, retorna null
        if (value === '' || value === undefined || value === null) return null;
        // Se for uma string de número ('1', '2', etc.) ou um número, converte para número
        return Number(value);
    })
    quartos?: number | null;

    @IsInt()
    @IsOptional()
    @Min(0)
    @Transform(({ value }) => {
        if (value === '' || value === undefined || value === null) return null;
        return Number(value);
    })
    banheiros?: number | null;

    @IsBoolean()
    @IsOptional()
    garagem?: boolean; // O frontend já envia true/false
}