// src/auth/interfaces/usuario-payload.interface.ts

// ⭐️ ATENÇÃO: O nome da propriedade aqui DEVE ser 'empresa' (como usado no JWT)
// e não 'empresaId', para ser consistente com as outras entidades (ex: Agendamento) 
// onde usamos 'req.user.empresa'.

import { PerfisEnum } from 'src/usuario/schemas/usuario.schema'; // Importe o Enum correto

/**
 * Interface que representa o payload decodificado do token JWT.
 * É injetada no req.user após a validação bem-sucedida.
 */
export interface UsuarioPayload {
    userId: string;
    email: string;
    // ⭐️ Usando o PerfisEnum
    perfil: PerfisEnum;
    empresa: string; // ID da empresa do usuário (Chave de Multitenancy)
    // Propriedades padrão do JWT (iat, exp) também podem estar presentes, mas não são necessárias aqui
}