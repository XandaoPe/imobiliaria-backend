import { IsEnum, IsOptional, IsString, IsObject, IsNumber, Matches } from 'class-validator';
import { StatusNegociacao } from '../schemas/negociacao.schema';

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
        message: 'dataAgendamento deve estar no formato ISO 8601 (ex: 2024-01-30T14:30:00Z ou 2024-01-30T14:30:00-03:00)'
    })
    dataAgendamento?: string; // Aceita tanto Z quanto offset

    @IsOptional()
    @IsObject()
    dadosFinanceiros?: {
        valorTotal: number;
        valorEntrada: number;
        qtdParcelas: number;
        valorParcela: number;
        diaVencimento?: number;
        ajustePorcentagem?: number; // ADICIONADO
        ajusteFixo?: number;        // ADICIONADO
    };
}