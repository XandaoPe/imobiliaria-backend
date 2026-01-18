
// src/configuracao/dto/update-configuracao.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateConfiguracaoDto } from './create-configuracao.dto';

export class UpdateConfiguracaoDto extends PartialType(CreateConfiguracaoDto) { }