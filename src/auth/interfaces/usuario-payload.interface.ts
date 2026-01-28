// src/auth/interfaces/usuario-payload.interface.ts

import { PerfisEnum } from 'src/usuario/schemas/usuario.schema'; // Importe o Enum correto

export interface UsuarioPayload {
    sub?: string;     // Padrão JWT para ID do usuário
    userId?: string;  // Sua propriedade atual
    _id?: string;     // Adicione esta linha
    nome: string;
    email: string;
    perfil: PerfisEnum;
    empresa: string;
}