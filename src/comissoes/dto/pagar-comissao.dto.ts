import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsDateString, IsArray } from 'class-validator';

export class PagarComissaoDto {
    @ApiProperty({
        description: 'IDs das comissões a pagar',
        type: [String]
    })
    @IsArray()
    @IsString({ each: true })
    comissaoIds: string[];

    @ApiProperty({
        enum: ['PIX', 'TRANSFERENCIA', 'DINHEIRO', 'OUTRO'],
        required: false
    })
    @IsEnum(['PIX', 'TRANSFERENCIA', 'DINHEIRO', 'OUTRO'])
    @IsOptional()
    formaPagamento?: string;

    @ApiProperty({ description: 'Data do pagamento', required: false })
    @IsDateString()
    @IsOptional()
    dataPagamento?: string;

    @ApiProperty({ description: 'Observações do pagamento', required: false })
    @IsString()
    @IsOptional()
    observacao?: string;
}