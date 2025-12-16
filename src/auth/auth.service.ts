// src/auth/auth.service.ts

import { Injectable, UnauthorizedException, ConflictException, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsuarioService } from '../usuario/usuario.service';
// ⭐️ NOVAS IMPORTAÇÕES PARA O REGISTRO MESTRE:
import { Model, Connection } from 'mongoose';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Empresa, EmpresaDocument } from 'src/empresa/schemas/empresa.schema';
import { Usuario, UsuarioDocument, PerfisEnum } from 'src/usuario/schemas/usuario.schema';
import { RegisterMasterDto } from './dto/register-master.dto'; // DTO que criamos no passo anterior

const saltOrRounds = 10;

@Injectable()
export class AuthService {
    constructor(
        private usuarioService: UsuarioService,
        private jwtService: JwtService,
        // ⭐️ INJEÇÕES PARA O REGISTRO MESTRE E TRANSAÇÕES
        @InjectModel(Empresa.name) private empresaModel: Model<EmpresaDocument>,
        @InjectModel(Usuario.name) private usuarioModel: Model<UsuarioDocument>,
        @InjectConnection() private readonly connection: Connection,
    ) { }

    // 1. Valida o Usuário (Busca + Comparação da Senha)
    async validateUser(email: string, senha: string, empresaId?: string): Promise<any> {
        // ⭐️ Busca por email E ID da Empresa (Multitenancy)
        const usuario = await this.usuarioService.findOneByEmailAndEmpresa(email, empresaId || '');

        if (usuario && (await bcrypt.compare(senha, usuario.senha))) {
            // ⭐️ AJUSTE CHAVE: Use .toJSON() em vez de .toObject() para aplicar as transformações
            // Alternativamente, se .toJSON() não funcionar devido ao tipo, fazemos a conversão manual:

            const usuarioObjeto = usuario.toObject();

            // Conversão manual da propriedade 'empresa' para string
            if (usuarioObjeto.empresa && typeof usuarioObjeto.empresa !== 'string') {
                usuarioObjeto.empresa = usuarioObjeto.empresa.toString();
            }

            // Remove a senha do objeto de resultado (resultado que será usado no JWT Payload)
            const { senha: _, ...result } = usuarioObjeto;

            return result;
        }
        throw new UnauthorizedException('Credenciais inválidas ou empresa não encontrada.');
    }

    // 2. Gera o Token JWT após a validação bem-sucedida
    async login(usuario: any) {
        const payload = {
            nome: usuario.nome,
            email: usuario.email,
            sub: usuario._id,
            perfil: usuario.perfil,
            // ⭐️ Garante que é uma string, caso a conversão do validateUser falhe por alguma razão.
            empresaId: usuario.empresa.toString(),
        };

        return {
            access_token: this.jwtService.sign(payload),
        };
    }

    // ⭐️ 3. NOVO MÉTODO: REGISTRO MESTRE COM TRANSAÇÃO
    async registerMaster(dto: RegisterMasterDto): Promise<any> {
        const session = await this.connection.startSession();
        session.startTransaction();

        try {
            // 1. Verificar Duplicidade (Empresa)
            const existingEmpresa = await this.empresaModel.findOne({ cnpj: dto.cnpj }).session(session).exec();
            if (existingEmpresa) {
                throw new ConflictException('Uma empresa com este CNPJ já está registrada.');
            }

            // 2. Verificar Duplicidade (Usuário)
            const existingUsuario = await this.usuarioModel.findOne({ email: dto.email }).session(session).exec();
            if (existingUsuario) {
                throw new ConflictException('Este email já está sendo utilizado por outro usuário (mesmo em outra empresa).');
            }

            // 3. Hash da Senha
            const hashedPassword = await bcrypt.hash(dto.senha, saltOrRounds);

            // 4. Criar a Empresa
            const createdEmpresa = new this.empresaModel({
                cnpj: dto.cnpj,
                nome: dto.nome,
                isAdmGeral: dto.isAdmGeral || false,
                ativa: true,
            });

            await createdEmpresa.save({ session });

            // 5. Criar o Usuário Administrador Master
            const createdUsuario = new this.usuarioModel({
                email: dto.email,
                senha: hashedPassword,
                nome: dto.nomeCompleto,
                empresa: createdEmpresa._id, // Associa à nova empresa
                perfil: PerfisEnum.ADM_GERAL, // Define como Administrador Mestre
                ativo: true,
            });

            await createdUsuario.save({ session });

            // 6. Comitar
            await session.commitTransaction();
            session.endSession();

            return {
                message: 'Administração e Usuário Master criados com sucesso!',
                empresaId: createdEmpresa._id,
                userId: createdUsuario._id,
            };

        } catch (error) {
            // 7. Abortar e relançar
            await session.abortTransaction();
            session.endSession();

            if (error instanceof ConflictException || error instanceof BadRequestException) {
                throw error;
            }

            console.error('Erro durante o Registro Master:', error);
            throw new InternalServerErrorException('Falha interna do servidor ao registrar a administração.');
        }
    }
}