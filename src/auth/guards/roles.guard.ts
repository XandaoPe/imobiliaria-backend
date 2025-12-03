// src/auth/guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PerfisEnum } from 'src/usuario/schemas/usuario.schema';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        // 1. Obtém os perfis necessários (Roles) definidos pelo nosso @Roles decorator na rota
        const requiredRoles = this.reflector.getAllAndOverride<PerfisEnum[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        // Se a rota não tiver um @Roles, ela é pública (qualquer um logado pode acessar)
        if (!requiredRoles) {
            return true;
        }

        // 2. Obtém o usuário logado (injetado pelo AuthGuard/JwtStrategy no req.user)
        const { user } = context.switchToHttp().getRequest();

        // 3. Verifica se o perfil do usuário logado está na lista de perfis necessários
        return requiredRoles.some((role) => user.perfil === role);
    }
}