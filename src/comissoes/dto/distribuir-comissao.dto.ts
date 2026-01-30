import { ApiProperty } from '@nestjs/swagger';
import {
    IsString, IsEnum, IsNumber, IsOptional,
    IsBoolean, IsArray, IsObject, ValidateNested
} from 'class-validator';
import { Type } from 'class-transformer';

export class UsuarioComissaoDto {
    @ApiProperty()
    @IsString()
    usuarioId: string;

    @ApiProperty()
    @IsNumber()
    @IsOptional()
    percentual?: number;

    @ApiProperty()
    @IsNumber()
    @IsOptional()
    valorFixo?: number;

    @ApiProperty()
    @IsString()
    @IsOptional()
    observacao?: string;
}

export class DistribuirComissaoDto {
    @ApiProperty({ description: 'ID do lançamento financeiro' })
    @IsString()
    financeiroId: string;

    @ApiProperty({
        description: 'Método de cálculo: AUTO (pelas regras), MANUAL (definido manualmente)',
        enum: ['AUTO', 'MANUAL']
    })
    @IsString()
    metodo: 'AUTO' | 'MANUAL';

    @ApiProperty({
        description: 'Lista de usuários e suas comissões (para modo MANUAL)',
        type: [UsuarioComissaoDto],
        required: false
    })
    @IsArray()
    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => UsuarioComissaoDto)
    usuarios?: UsuarioComissaoDto[];

    @ApiProperty({ description: 'Observações da distribuição', required: false })
    @IsString()
    @IsOptional()
    observacao?: string;

    @ApiProperty({
        description: 'Forçar redistribuição mesmo se já distribuído',
        default: false
    })
    @IsBoolean()
    @IsOptional()
    forcarRedistribuicao?: boolean;
}