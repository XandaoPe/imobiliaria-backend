// src/usuario/dto/update-usuario.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateUsuarioDto } from './create-usuario.dto';

// Remove a obrigatoriedade da empresaId e senha para a atualização
// Embora a senha seja importante, ela deve ser atualizada via um endpoint específico
export class UpdateUsuarioDto extends PartialType(CreateUsuarioDto) { }