// src/usuario/usuario.service.ts - VERSÃO CORRIGIDA E ATUALIZADA
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, FilterQuery } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { PerfisEnum, Usuario, UsuarioDocument } from './schemas/usuario.schema';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { PixValidationService } from 'src/shared/services/pix-validation.service';
import { ChavePixDto, TipoChavePix, ValidarChavePixDto } from 'src/shared/dto/chave-pix.dto';

const saltOrRounds = 10;

@Injectable()
export class UsuarioService {
    constructor(
        @InjectModel(Usuario.name) private usuarioModel: Model<UsuarioDocument>,
        private readonly pixValidationService: PixValidationService,
    ) { }

    async findByEmail(email: string): Promise<UsuarioDocument[]> {
        return this.usuarioModel.find({ email })
            .select('+senha')
            .populate('empresa')
            .exec();
    }

    async findOneByEmailAndEmpresa(email: string, empresaId: string): Promise<UsuarioDocument | null> {
        let empresaObjectId: Types.ObjectId;
        try {
            empresaObjectId = new Types.ObjectId(empresaId);
        } catch (e) {
            return null;
        }
        return this.usuarioModel.findOne({
            email,
            empresa: empresaObjectId
        }).exec();
    }

    async create(createUsuarioDto: CreateUsuarioDto, empresaId: string): Promise<Usuario> {
        const hashedPassword = await bcrypt.hash(createUsuarioDto.senha, saltOrRounds);

        const createdUsuario = new this.usuarioModel({
            ...createUsuarioDto,
            senha: hashedPassword,
            empresa: new Types.ObjectId(empresaId),
        });

        try {
            const savedUsuario = await createdUsuario.save();
            return savedUsuario.toObject();
        } catch (error) {
            if (error.code === 11000) {
                throw new BadRequestException('Email já cadastrado para esta empresa.');
            }
            throw error;
        }
    }

    async findAll(
        empresaId: string,
        search?: string,
        perfil?: PerfisEnum,
        ativo?: string
    ): Promise<Usuario[]> {

        const filter: FilterQuery<UsuarioDocument> = {
            empresa: new Types.ObjectId(empresaId)
        };

        if (search && search.trim()) {
            const regex = new RegExp(search, 'i');
            filter.$or = [
                { nome: { $regex: regex } },
                { email: { $regex: regex } },
            ];
        }

        const perfilValido = perfil && Object.values(PerfisEnum).includes(perfil);

        if (perfilValido) {
            filter.perfil = perfil;
        }

        if (ativo !== undefined && ativo !== null) {
            if (ativo === 'true') {
                filter.ativo = true;
            } else if (ativo === 'false') {
                filter.ativo = false;
            }
        }

        const usuarios = await this.usuarioModel.find(filter).exec();

        return usuarios.map(u => {
            const obj = u.toObject();
            if (obj.empresa) {
                const empresaRef = obj.empresa as any;
                obj.empresa = empresaRef._id
                    ? empresaRef._id.toString()
                    : empresaRef.toString();
            }
            return obj;
        });
    }

    async findOne(usuarioId: string, empresaId: string): Promise<Usuario> {
        const usuario = await this.usuarioModel
            .findOne({
                _id: new Types.ObjectId(usuarioId),
                empresa: new Types.ObjectId(empresaId),
            })
            .exec();

        if (!usuario) {
            throw new NotFoundException(`Usuário com ID "${usuarioId}" não encontrado.`);
        }
        return usuario.toObject();
    }

    async update(usuarioId: string, updateUsuarioDto: any, empresaId: string): Promise<Usuario> {
        const { pushToken, ...dadosRestantes } = updateUsuarioDto;
        const updateQuery: any = { $set: dadosRestantes };

        if (dadosRestantes.senha) {
            updateQuery.$set.senha = await bcrypt.hash(dadosRestantes.senha, saltOrRounds);
        }

        if (pushToken) {
            updateQuery.$addToSet = { pushToken: pushToken };
        }

        const updatedUsuario = await this.usuarioModel
            .findOneAndUpdate(
                {
                    _id: new Types.ObjectId(usuarioId),
                    empresa: new Types.ObjectId(empresaId),
                },
                updateQuery,
                { new: true },
            )
            .exec();

        if (!updatedUsuario) {
            throw new NotFoundException(`Usuário não encontrado.`);
        }
        return updatedUsuario.toObject();
    }

    async remove(usuarioId: string, empresaId: string): Promise<{ message: string }> {
        const result = await this.usuarioModel.deleteOne({
            _id: new Types.ObjectId(usuarioId),
            empresa: new Types.ObjectId(empresaId),
        }).exec();

        if (result.deletedCount === 0) {
            throw new NotFoundException(`Usuário não encontrado.`);
        }

        return { message: `Usuário removido com sucesso.` };
    }

    async buscarUsuariosSemToken(empresaId: string) {
        const usuariosSemToken = await this.usuarioModel.find({
            empresa: new Types.ObjectId(empresaId),
            $or: [
                { pushToken: { $exists: false } },
                { pushToken: '' },
                { pushToken: null },
                { pushToken: { $size: 0 } }
            ]
        });

        return {
            total: usuariosSemToken.length,
            usuarios: usuariosSemToken.map(u => ({
                nome: u.nome,
                email: u.email,
                id: u._id.toString()
            }))
        };
    }

    async findCorretoresPorEmpresa(empresaId: string): Promise<Usuario[]> {
        const usuarios = await this.usuarioModel
            .find({
                empresa: new Types.ObjectId(empresaId),
                perfil: PerfisEnum.CORRETOR,
                ativo: true
            })
            .select('nome email perfil ativo')
            .exec();

        return usuarios.map(u => u.toObject());
    }

    // 🔑 ADICIONAR/ATUALIZAR CHAVE PIX (SEM VALIDAÇÕES DE FORMATO)
    async adicionarChavePix(usuarioId: string, chavePixDto: ChavePixDto, empresaId: string): Promise<Usuario> {
        // Limpeza de caracteres apenas para tipos numéricos, sem rejeitar por formato
        const chaveLimpa = [TipoChavePix.CPF, TipoChavePix.CNPJ, TipoChavePix.TELEFONE].includes(chavePixDto.tipo)
            ? chavePixDto.chave.replace(/\D/g, '')
            : chavePixDto.chave;

        // Verificar unicidade apenas se for uma chave validada
        const chaveExistente = await this.usuarioModel.findOne({
            _id: { $ne: new Types.ObjectId(usuarioId) },
            empresa: new Types.ObjectId(empresaId),
            'chavePix.chave': chaveLimpa,
            'chavePix.validado': true
        });

        if (chaveExistente) {
            throw new BadRequestException('Esta chave PIX já está validada para outro usuário nesta empresa');
        }

        if (chavePixDto.preferencial) {
            await this.usuarioModel.updateOne(
                { _id: new Types.ObjectId(usuarioId), empresa: new Types.ObjectId(empresaId) },
                { $set: { 'chavePix.preferencial': false, 'chavesPixAlternativas.$[].preferencial': false } }
            );
        }

        const chavePixData = {
            tipo: chavePixDto.tipo,
            chave: chaveLimpa,
            validado: false, // Inicia como falso para exigir validação se desejar
            preferencial: chavePixDto.preferencial || false,
            dataCadastro: new Date().toISOString().split('T')[0]
        };

        const usuarioAtualizado = await this.usuarioModel.findOneAndUpdate(
            { _id: new Types.ObjectId(usuarioId), empresa: new Types.ObjectId(empresaId) },
            {
                $set: {
                    chavePix: chavePixData,
                    'pixValidacaoStatus.tentativas': 0,
                    'pixValidacaoStatus.bloqueadoAte': null
                }
            },
            { new: true }
        ).exec();

        if (!usuarioAtualizado) throw new NotFoundException('Usuário não encontrado');

        if (chavePixDto.tipo === TipoChavePix.EMAIL) {
            await this.enviarCodigoValidacaoEmail(usuarioAtualizado, chavePixDto.chave);
        }

        return usuarioAtualizado.toObject();
    }

    async removerChavePix(usuarioId: string, empresaId: string): Promise<Usuario> {
        const usuarioAtualizado = await this.usuarioModel.findOneAndUpdate(
            { _id: new Types.ObjectId(usuarioId), empresa: new Types.ObjectId(empresaId) },
            {
                $unset: { chavePix: '', pixValidacaoStatus: '' },
                $set: { chavesPixAlternativas: [] }
            },
            { new: true }
        ).exec();

        if (!usuarioAtualizado) throw new NotFoundException('Usuário não encontrado');
        return usuarioAtualizado.toObject();
    }

    async validarChavePix(usuarioId: string, validarDto: ValidarChavePixDto, empresaId: string): Promise<Usuario> {
        const usuario = await this.usuarioModel.findOne({
            _id: new Types.ObjectId(usuarioId),
            empresa: new Types.ObjectId(empresaId)
        });

        if (!usuario || !usuario.chavePix) {
            throw new BadRequestException('Usuário ou chave PIX não encontrada');
        }

        const statusValidacao = usuario.pixValidacaoStatus || { tentativas: 0 };

        // TODO: Implementar lógica real. Aceitando '123456' por enquanto.
        const codigoValido = validarDto.codigoValidacao === '123456';

        if (!codigoValido) {
            await this.usuarioModel.updateOne(
                { _id: usuario._id },
                { $inc: { 'pixValidacaoStatus.tentativas': 1 }, $set: { 'pixValidacaoStatus.ultimaTentativaValidacao': new Date().toISOString() } }
            );
            throw new BadRequestException('Código de validação inválido');
        }

        const usuarioAtualizado = await this.usuarioModel.findOneAndUpdate(
            { _id: usuario._id },
            {
                $set: {
                    'chavePix.validado': true,
                    'chavePix.dataValidacao': new Date().toISOString().split('T')[0],
                    'pixValidacaoStatus.tentativas': 0,
                    'pixValidacaoStatus.bloqueadoAte': null
                }
            },
            { new: true }
        ).exec();

        if (!usuarioAtualizado) {
            throw new NotFoundException('Usuário não encontrado');
        }

        return usuarioAtualizado.toObject();
    }

    // src/usuario/usuario.service.ts

    async buscarPorChavePix(chave: string, empresaId: string): Promise<Usuario | null> {
        // Busca direta, sem limpeza de caracteres
        const usuario = await this.usuarioModel.findOne({
            empresa: new Types.ObjectId(empresaId),
            $or: [
                { 'chavePix.chave': chave },
                { 'chavePix.chave': chave.replace(/\D/g, '') },
                { chavesPixAlternativas: chave }
            ]
        }).exec();

        return usuario ? usuario.toObject() : null;
    }

    async temChavePixValida(usuarioId: string, empresaId: string): Promise<boolean> {
        const usuario = await this.usuarioModel.findOne({
            _id: new Types.ObjectId(usuarioId),
            empresa: new Types.ObjectId(empresaId),
            'chavePix.validado': true
        }).select('chavePix').exec();

        return !!usuario?.chavePix?.chave;
    }

    private async enviarCodigoValidacaoEmail(usuario: UsuarioDocument, email: string): Promise<void> {
        console.log(`📧 Código PIX para ${email}: 123456`);
    }

    async listarComChavePixValida(empresaId: string): Promise<Usuario[]> {
        const usuarios = await this.usuarioModel.find({
            empresa: new Types.ObjectId(empresaId),
            'chavePix.validado': true
        }).select('nome email perfil chavePix').exec();

        return usuarios.map(usuario => usuario.toObject());
    }
}