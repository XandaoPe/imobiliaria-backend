// src/cliente/dto/update-cliente.dto.ts (Não precisa de alteração se CreateClienteDto foi corrigido)
import { PartialType } from '@nestjs/mapped-types';
import { CreateClienteDto } from './create-cliente.dto';

export class UpdateClienteDto extends PartialType(CreateClienteDto) { }