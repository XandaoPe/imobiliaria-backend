// src/agendamento/dto/update-agendamento.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateAgendamentoDto } from './create-agendamento.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { StatusAgendamento } from '../schemas/agendamento.schema';

// Estende PartialType para que todos os campos sejam opcionais
export class UpdateAgendamentoDto extends PartialType(CreateAgendamentoDto) {

    // Sobrescreve apenas o campo status para permitir a atualização isolada
    @ApiProperty({
        description: 'Novo status do agendamento.',
        enum: StatusAgendamento,
        required: false
    })
    @IsOptional()
    @IsEnum(StatusAgendamento, { message: 'Status inválido.' })
    status?: StatusAgendamento;
}