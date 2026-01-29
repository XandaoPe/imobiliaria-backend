import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsBoolean, IsNumber, Min, IsMongoId } from 'class-validator';
import { TipoImovel } from '../schemas/imovel.schema';

export class CreateImovelDto {
    @ApiProperty({ description: 'Título do imóvel' })
    @IsString()
    titulo: string;

    @ApiProperty({ enum: TipoImovel, description: 'Tipo do imóvel' })
    @IsEnum(TipoImovel)
    tipo: TipoImovel;

    @ApiProperty({ description: 'Endereço completo' })
    @IsString()
    endereco: string;

    @ApiPropertyOptional({ description: 'Disponível para venda?' })
    @IsBoolean()
    @IsOptional()
    para_venda?: boolean;

    @ApiPropertyOptional({ description: 'Disponível para aluguel?' })
    @IsBoolean()
    @IsOptional()
    para_aluguel?: boolean;

    @ApiPropertyOptional({ description: 'Valor de venda' })
    @IsNumber()
    @Min(0)
    @IsOptional()
    valor_venda?: number;

    @ApiPropertyOptional({ description: 'Valor de aluguel' })
    @IsNumber()
    @Min(0)
    @IsOptional()
    valor_aluguel?: number;

    @ApiPropertyOptional({ description: 'Disponível?' })
    @IsBoolean()
    @IsOptional()
    disponivel?: boolean;

    @ApiPropertyOptional({ description: 'Cidade' })
    @IsString()
    @IsOptional()
    cidade?: string;

    @ApiPropertyOptional({ description: 'Descrição detalhada' })
    @IsString()
    @IsOptional()
    descricao?: string;

    @ApiPropertyOptional({ description: 'Detalhes adicionais' })
    @IsString()
    @IsOptional()
    detalhes?: string;

    @ApiPropertyOptional({ description: 'Número de quartos' })
    @IsNumber()
    @Min(0)
    @IsOptional()
    quartos?: number;

    @ApiPropertyOptional({ description: 'Número de banheiros' })
    @IsNumber()
    @Min(0)
    @IsOptional()
    banheiros?: number;

    @ApiPropertyOptional({ description: 'Área do terreno (m²)' })
    @IsNumber()
    @Min(0)
    @IsOptional()
    area_terreno?: number;

    @ApiPropertyOptional({ description: 'Área construída (m²)' })
    @IsNumber()
    @Min(0)
    @IsOptional()
    area_construida?: number;

    @ApiPropertyOptional({ description: 'Tem garagem?' })
    @IsBoolean()
    @IsOptional()
    garagem?: boolean;

    @ApiProperty({ description: 'ID do proprietário' })
    @IsMongoId()
    proprietario: string;

    @ApiPropertyOptional({
        description: 'ID do corretor responsável',
        type: String,
        nullable: true // ⭐️ IMPORTANTE: Indica que pode ser null
    })
    @IsMongoId()
    @IsOptional()
    corretor?: string | null; // ⭐️ MUDAR: string | null em vez de apenas string
}
