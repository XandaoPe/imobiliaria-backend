// src/pix/dto/gerar-qrcode-pix.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, IsOptional, IsEnum, Min, Max } from 'class-validator';

export class GerarQrCodePixDto {
    @ApiProperty({
        description: 'ID do lançamento financeiro',
        example: '507f1f77bcf86cd799439011'
    })
    @IsString()
    @IsNotEmpty()
    lancamentoId: string;

    @ApiPropertyOptional({
        description: 'Descrição personalizada (opcional)',
        example: 'Pagamento de aluguel - Unidade 101'
    })
    @IsOptional()
    @IsString()
    descricaoPersonalizada?: string;

    @ApiPropertyOptional({
        description: 'Valor personalizado (se diferente do lançamento)',
        example: 1500.50
    })
    @IsOptional()
    @IsNumber()
    @Min(0.01)
    valorPersonalizado?: number;
}

export class ConsultarPagamentoPixDto {
    @ApiProperty({
        description: 'ID da transação PIX',
        example: '507f1f77bcf86cd799439012'
    })
    @IsString()
    @IsNotEmpty()
    transacaoPixId: string;
}

export class ReenviarQrCodePixDto {
    @ApiProperty({
        description: 'ID da transação PIX',
        example: '507f1f77bcf86cd799439012'
    })
    @IsString()
    @IsNotEmpty()
    transacaoPixId: string;
}

export class CancelarQrCodePixDto {
    @ApiProperty({
        description: 'ID da transação PIX',
        example: '507f1f77bcf86cd799439012'
    })
    @IsString()
    @IsNotEmpty()
    transacaoPixId: string;

    @ApiPropertyOptional({
        description: 'Motivo do cancelamento',
        example: 'Pagamento realizado por outro método'
    })
    @IsOptional()
    @IsString()
    motivo?: string;
}