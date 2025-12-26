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

        @InjectModel(Empresa.name) private empresaModel: Model<EmpresaDocument>,
        @InjectModel(Usuario.name) private usuarioModel: Model<UsuarioDocument>,
        @InjectConnection() private readonly connection: Connection,
    ) { }

    async validateUser(email: string, senha: string, empresaId?: string): Promise<any> {

        const usuarios = await this.usuarioService.findByEmail(email);

        if (!usuarios || usuarios.length === 0) {
            throw new UnauthorizedException('Credenciais inválidas.');
        }

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

        if (!empresaId) {

            const empresasDisponiveis = usuariosAutenticados

                .filter(u => u.empresa)
                .map(u => {

                    const empresaPopulated = u.empresa as unknown as EmpresaDocument;

                    const idDaEmpresa = u.empresa.toString();

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

        const usuarioSelecionado = usuariosAutenticados.find(
            u => u.empresa.toString() === empresaId,
        );

        if (!usuarioSelecionado) {
            throw new UnauthorizedException('Empresa selecionada não corresponde às credenciais fornecidas.');
        }

        const usuarioObjeto = usuarioSelecionado.toObject();

        if (usuarioObjeto.empresa) {
            if (usuarioObjeto.empresa instanceof Types.ObjectId || typeof usuarioObjeto.empresa === 'string') {
                usuarioObjeto.empresa = usuarioObjeto.empresa.toString();
            } else {
                usuarioObjeto.empresa = (usuarioObjeto.empresa as any)._id.toString();
            }
        }
        const { senha: _, ...result } = usuarioObjeto;
        return result;
    }

    async login(usuario: any) {
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

    async registerMaster(dto: RegisterMasterDto): Promise<any> {
        const session = await this.connection.startSession();
        session.startTransaction();

        try {
            const existingEmpresa = await this.empresaModel.findOne({ cnpj: dto.cnpj }).session(session).exec();
            if (existingEmpresa) {
                throw new ConflictException('Uma empresa com este CNPJ já está registrada.');
            }
            const existingUsuario = await this.usuarioModel.findOne({ email: dto.email }).session(session).exec();
            // if (existingUsuario) {
            //     throw new ConflictException('Este email já está sendo utilizado por outro usuário (mesmo em outra empresa).');
            // }

            const hashedPassword = await bcrypt.hash(dto.senha, saltOrRounds);

            const createdEmpresa = new this.empresaModel({
                cnpj: dto.cnpj,
                nome: dto.nome,
                isAdmGeral: dto.isAdmGeral || false,
                ativa: true,
            });

            await createdEmpresa.save({ session });

            const createdUsuario = new this.usuarioModel({
                email: dto.email,
                senha: hashedPassword,
                nome: dto.nomeCompleto,
                empresa: createdEmpresa._id as Types.ObjectId,
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