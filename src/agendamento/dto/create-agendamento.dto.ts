// src/agendamento/dto/create-agendamento.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsMongoId, IsOptional, IsEnum } from 'class-validator';
import { StatusAgendamento } from '../schemas/agendamento.schema';

export class CreateAgendamentoDto {
    @ApiProperty({ description: 'ID do imóvel que será visitado.' })
    @IsMongoId({ message: 'O Imovel ID deve ser um ID válido do Mongo.' })
    imovelId: string;

    @ApiProperty({ description: 'ID do cliente que fará a visita.' })
    @IsMongoId({ message: 'O Cliente ID deve ser um ID válido do Mongo.' })
    clienteId: string;

    @ApiProperty({
        description: 'Data e hora do agendamento (formato ISO 8601, ex: 2025-12-05T10:00:00Z).',
        example: '2025-12-05T10:00:00Z',
    })
    @IsDateString({}, { message: 'A data/hora deve ser uma string válida no formato ISO 8601.' })
    dataHora: string;

    @ApiProperty({
        description: 'Status inicial do agendamento.',
        enum: StatusAgendamento,
        default: StatusAgendamento.PENDENTE,
        required: false
    })
    @IsOptional()
    @IsEnum(StatusAgendamento)
    status?: StatusAgendamento;
}