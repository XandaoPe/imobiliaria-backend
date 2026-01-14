import { IsEnum, IsOptional, IsString, IsObject, IsNumber } from 'class-validator';
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
    dataAgendamento?: string;

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