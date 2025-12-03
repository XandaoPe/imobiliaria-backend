// src/empresa/dto/update-empresa.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateEmpresaDto } from './create-empresa.dto';

// Permite que todos os campos do CreateEmpresaDto sejam opcionais para atualização
export class UpdateEmpresaDto extends PartialType(CreateEmpresaDto) { }