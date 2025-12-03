// src/auth/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { PerfisEnum } from 'src/usuario/schemas/usuario.schema';

// A chave que será usada para armazenar os perfis no metadado da rota
export const ROLES_KEY = 'roles';

/**
 * Decorator para definir quais perfis têm acesso a uma rota específica.
 * @param roles Array de perfis (Ex: [PerfilUsuario.ADM_GERAL, PerfilUsuario.GERENTE])
 */
export const Roles = (...roles: PerfisEnum[]) => SetMetadata(ROLES_KEY, roles);