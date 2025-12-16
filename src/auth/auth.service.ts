import {
    Injectable,
    UnauthorizedException,
    ConflictException,
    InternalServerErrorException,
    BadRequestException
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsuarioService } from '../usuario/usuario.service';

// ⭐️ INJEÇÕES DE MODELOS E TRANSAÇÕES
import { Model, Connection, Types } from 'mongoose';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Empresa, EmpresaDocument } from 'src/empresa/schemas/empresa.schema';
import { Usuario, UsuarioDocument, PerfisEnum } from 'src/usuario/schemas/usuario.schema';
import { RegisterMasterDto } from './dto/register-master.dto';

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

    /**
     * 1. Valida o Usuário em Duas Etapas
     * - Etapa 1 (Sem empresaId): Retorna lista de empresas válidas após verificar email/senha.
     * - Etapa 2 (Com empresaId): Retorna o objeto do usuário para geração do token.
     */
    async validateUser(email: string, senha: string, empresaId?: string): Promise<any> {

        // 1. Busca todos os usuários com este email (populando a empresa)
        const usuarios = await this.usuarioService.findByEmail(email);

        if (!usuarios || usuarios.length === 0) {
            throw new UnauthorizedException('Credenciais inválidas.');
        }

        // 2. Filtrar apenas os usuários cuja senha está correta
        const usuariosValidos = await Promise.all(
            usuarios.map(async (u) => {
                if (await bcrypt.compare(senha, u.senha)) {
                    return u;
                }
                return null;
            }),
        );

        const usuariosAutenticados = usuariosValidos.filter((u): u is UsuarioDocument => u !== null);

        if (usuariosAutenticados.length === 0) {
            throw new UnauthorizedException('Credenciais inválidas.');
        }

        // -----------------------------------------------------
        // ⭐️ ETAPA 1: Seleção de Empresa Necessária
        // -----------------------------------------------------
        if (!empresaId) {

            const empresasDisponiveis = usuariosAutenticados
                // Garante que 'empresa' não é nula/undefined
                .filter(u => u.empresa)
                .map(u => {

                    // Afirmação de Tipo (para o compilador saber sobre o 'nome')
                    const empresaPopulated = u.empresa as unknown as EmpresaDocument;

                    // Pega o ID (sempre deve funcionar se u.empresa não for null)
                    const idDaEmpresa = u.empresa.toString();

                    // Pega o nome populado ou um placeholder
                    const empresaNome = empresaPopulated && empresaPopulated.nome
                        ? empresaPopulated.nome
                        : `Empresa ID: ${idDaEmpresa}`;

                    return {
                        id: idDaEmpresa,
                        nome: empresaNome,
                    };
                });

            return { requiresSelection: true, empresas: empresasDisponiveis };
        }

        // -----------------------------------------------------
        // ⭐️ ETAPA 2: Geração do Token (ID da empresa foi selecionado)
        // -----------------------------------------------------
        const usuarioSelecionado = usuariosAutenticados.find(
            // Compara o ID string do input com o ID ObjectId do documento
            u => u.empresa.toString() === empresaId,
        );

        if (!usuarioSelecionado) {
            throw new UnauthorizedException('Empresa selecionada não corresponde às credenciais fornecidas.');
        }

        // Prepara o objeto para ser inserido no JWT payload
        const usuarioObjeto = usuarioSelecionado.toObject();

        // ⭐️ CORREÇÃO APLICADA AQUI: Garante que a propriedade 'empresa' seja apenas o ID em string.
        if (usuarioObjeto.empresa) {
            if (usuarioObjeto.empresa instanceof Types.ObjectId || typeof usuarioObjeto.empresa === 'string') {
                // Se for um ObjectId (não populado) ou string, apenas converte para string
                usuarioObjeto.empresa = usuarioObjeto.empresa.toString();
            } else {
                // Se for um objeto populado (EmpresaDocument), pega o _id e converte
                usuarioObjeto.empresa = (usuarioObjeto.empresa as any)._id.toString();
            }
        }

        // Remove a senha e retorna o resultado final
        const { senha: _, ...result } = usuarioObjeto;
        return result;
    }

    /**
     * 2. Gera o Token JWT
     */
    async login(usuario: any) {
        // Assume que 'usuario' já tem 'empresa' como string (do validateUser)
        const payload = {
            nome: usuario.nome,
            email: usuario.email,
            sub: usuario._id.toString(), // _id como string
            perfil: usuario.perfil,
            empresaId: usuario.empresa.toString(), // Empresa ID garantida como string
        };

        return {
            access_token: this.jwtService.sign(payload),
        };
    }

    /**
     * 3. REGISTRO MESTRE COM TRANSAÇÃO (Cria Empresa e Usuário ADM_GERAL)
     */
    async registerMaster(dto: RegisterMasterDto): Promise<any> {
        const session = await this.connection.startSession();
        session.startTransaction();

        try {
            // 1. Verificar Duplicidade (Empresa - CNPJ)
            const existingEmpresa = await this.empresaModel.findOne({ cnpj: dto.cnpj }).session(session).exec();
            if (existingEmpresa) {
                throw new ConflictException('Uma empresa com este CNPJ já está registrada.');
            }

            // 2. Verificar Duplicidade (Usuário - Email Global)
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
                empresa: createdEmpresa._id, // Associa à nova empresa (ObjectId)
                perfil: PerfisEnum.ADM_GERAL,
                ativo: true,
            });

            await createdUsuario.save({ session });

            // 6. Comitar
            await session.commitTransaction();
            session.endSession();

            return {
                message: 'Administração e Usuário Master criados com sucesso!',
                empresaId: createdEmpresa._id.toString(),
                userId: createdUsuario._id.toString(),
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