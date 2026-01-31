// negociacao/dto/update-status-negociacao.dto.ts
import { IsEnum, IsOptional, IsString, IsObject, IsNumber, Matches, IsArray, ValidateNested } from 'class-validator';
import { StatusNegociacao } from '../schemas/negociacao.schema';
import { Type } from 'class-transformer';

// Classe para representar uma comissão
export class ComissaoDto {
    @IsString()
    regraId: string;

    @IsString()
    usuarioId: string;

    @IsString()
    usuarioNome: string;

    @IsNumber()
    percentual: number;

    @IsOptional()
    @IsNumber()
    valorFixo?: number;

    @IsNumber()
    valorCalculado: number; // ✅ CORRIGIDO: De 'valCalculado' para 'valorCalculado'

    @IsString()
    tipoCalculo: string;

    @IsString()
    regraNome: string;
}

// Classe para os dados financeiros
export class DadosFinanceirosDto {
    @IsNumber()
    valorTotal: number;

    @IsNumber()
    valorEntrada: number;

    @IsNumber()
    qtdParcelas: number;

    @IsNumber()
    valorParcela: number;

    @IsOptional()
    @IsNumber()
    diaVencimento?: number;

    @IsOptional()
    @IsNumber()
    ajustePorcentagem?: number;

    @IsOptional()
    @IsNumber()
    ajusteFixo?: number;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ComissaoDto)
    comissoes?: ComissaoDto[];
}

export class UpdateStatusNegociacaoDto {
    @IsOptional()
    @IsEnum(StatusNegociacao)
    status?: StatusNegociacao;

    @IsOptional()
    @IsString()
    descricao?: string;

    @IsOptional()
    @IsString()
    @Matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/, {
        message: 'dataAgendamento deve estar no formato ISO 8601'
    })
    dataAgendamento?: string;

    @IsOptional()
    @ValidateNested()
    @Type(() => DadosFinanceirosDto)
    dadosFinanceiros?: DadosFinanceirosDto;
}