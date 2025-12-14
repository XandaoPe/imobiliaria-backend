// src/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsuarioService } from '../usuario/usuario.service';
import { UsuarioDocument } from '../usuario/schemas/usuario.schema';

@Injectable()
export class AuthService {
    constructor(
        private usuarioService: UsuarioService,
        private jwtService: JwtService,
    ) { }

    // 1. Valida o Usuário (Busca + Comparação da Senha)
    async validateUser(email: string, senha: string, empresaId?: string): Promise<any> {
        // ⭐️ Busca por email E ID da Empresa (Multitenancy)
        const usuario = await this.usuarioService.findOneByEmailAndEmpresa(email, empresaId);

        if (usuario && (await bcrypt.compare(senha, usuario.senha))) {
            // Se a senha for válida, retorna o objeto sem a senha
            const { senha: _, ...result } = usuario.toObject();
            return result;
        }
        return null;
    }

    // 2. Gera o Token JWT após a validação bem-sucedida
    async login(usuario: any) {
        const payload = {
            nome: usuario.nome,
            email: usuario.email,
            sub: usuario._id,
            perfil: usuario.perfil,
            empresaId: usuario.empresa.toString(), // ⭐️ Inclui o ID da empresa no Token
        };

        return {
            access_token: this.jwtService.sign(payload),
        };
    }
}