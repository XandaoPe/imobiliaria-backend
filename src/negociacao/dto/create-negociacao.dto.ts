import { IsString, IsNotEmpty, IsEnum, IsNumber, IsOptional, IsDateString, IsMongoId, IsArray } from 'class-validator';
import { TipoNegociacao, StatusNegociacao } from '../schemas/negociacao.schema';

export class CreateNegociacaoDto {
    @IsMongoId()
    @IsNotEmpty()
    imovel: string;

    @IsMongoId()
    @IsNotEmpty()
    cliente: string;

    @IsEnum(TipoNegociacao)
    @IsNotEmpty()
    tipo: TipoNegociacao;

    @IsEnum(StatusNegociacao)
    @IsOptional() // Permite que o backend use o padrão do Schema se não for enviado
    status?: StatusNegociacao;

    @IsNumber()
    @IsOptional() // 👈 MUDANÇA: No início (Prospecção) o valor pode ser desconhecido
    valor_acordado?: number;

    @IsDateString()
    @IsOptional()
    data_inicio_contrato?: string;

    @IsDateString()
    @IsOptional()
    data_fim_contrato?: string;

    @IsString()
    @IsOptional()
    observacoes_gerais?: string;

    @IsArray()
    @IsOptional()
    historico?: any[]; // Para aceitar o array de histórico enviado pelo frontend
}