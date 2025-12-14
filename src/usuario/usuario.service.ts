// src/usuario/usuario.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, FilterQuery } from 'mongoose'; // Adicionado FilterQuery
import * as bcrypt from 'bcrypt';
import { PerfisEnum, Usuario, UsuarioDocument } from './schemas/usuario.schema';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';

const saltOrRounds = 10;

@Injectable()
export class UsuarioService {
  constructor(
    @InjectModel(Usuario.name) private usuarioModel: Model<UsuarioDocument>,
  ) { }

  // ⭐️ BUSCA UTILIZADA PELO LOGIN/AUTH
  async findOneByEmailAndEmpresa(email: string, empresaId: string): Promise<UsuarioDocument | null> {
    return this.usuarioModel.findOne({ email, empresa: empresaId }).exec();
  }

  async create(createUsuarioDto: CreateUsuarioDto, empresaId: string): Promise<Usuario> {

    // 1. Hash da Senha
    const hashedPassword = await bcrypt.hash(createUsuarioDto.senha, saltOrRounds);

    const createdUsuario = new this.usuarioModel({
      ...createUsuarioDto,
      senha: hashedPassword,
      // ⭐️ AGORA PEGA O empresaId INJETADO PELO CONTROLLER
      empresa: empresaId,
    });

    try {
      // Validação para garantir que o DTO NÃO possui o campo empresaId
      // Se o seu DTO ainda tiver o campo empresaId, você deve removê-lo de:
      // src/usuario/dto/create-usuario.dto.ts
      return createdUsuario.save();
    } catch (error) {
      if (error.code === 11000) {
        // Erro de índice único (email + empresa)
        throw new BadRequestException('Email já cadastrado para esta empresa.');
      }
      throw error;
    }
  }

  async findAll(
    empresaId: string,
    search?: string,
    perfil?: PerfisEnum,
    ativo?: string // ⭐️ NOVO PARÂMETRO: Recebe 'true', 'false' ou undefined/null do controller
  ): Promise<Usuario[]> {

    const filter: FilterQuery<UsuarioDocument> = {
      empresa: empresaId // Usa a string do ID da empresa (Correção anterior)
    };

    // 1. Filtro de Busca (Search)
    if (search && search.trim()) {
      const regex = new RegExp(search, 'i');
      filter.$or = [
        { nome: { $regex: regex } },
        { email: { $regex: regex } },
      ];
    }

    // 2. Filtro de Perfil
    const perfilValido = perfil && Object.values(PerfisEnum).includes(perfil);

    if (perfilValido) {
      filter.perfil = perfil;
    }

    // 3. ⭐️ NOVO FILTRO: Status (Ativo/Inativo)
    if (ativo !== undefined && ativo !== null) {
      if (ativo === 'true') {
        filter.ativo = true;
      } else if (ativo === 'false') {
        filter.ativo = false;
      }
      // Se 'ativo' for qualquer outra coisa (como 'TODOS' se fosse enviado, ou string inválida) 
      // o filtro é ignorado, listando todos (ativos e inativos).
    }

    return this.usuarioModel.find(filter).exec();
  }

  async findOne(usuarioId: string, empresaId: string): Promise<Usuario> {
    const usuario = await this.usuarioModel
      .findOne({
        _id: usuarioId,
        empresa: empresaId,
      })
      .exec();

    if (!usuario) {
      throw new NotFoundException(`Usuário com ID "${usuarioId}" não encontrado ou não pertence a esta empresa.`);
    }
    return usuario;
  }

  // ⭐️ REIMPLEMENTADO: Update com Multitenancy
  async update(usuarioId: string, updateUsuarioDto: UpdateUsuarioDto, empresaId: string): Promise<Usuario> {
    const updatedUsuario = await this.usuarioModel
      .findOneAndUpdate(
        {
          _id: usuarioId,
          empresa: empresaId, // ⭐️ CORRIGIDO
        },
        {
          ...updateUsuarioDto,
          // Garante que a senha só seja atualizada se for fornecida e hasheia antes
          ...(updateUsuarioDto.senha && {
            senha: await bcrypt.hash(updateUsuarioDto.senha, saltOrRounds)
          })
        },
        { new: true },
      )
      .exec();

    if (!updatedUsuario) {
      throw new NotFoundException(`Usuário com ID "${usuarioId}" não encontrado ou não pertence a esta empresa.`);
    }
    return updatedUsuario;
  }

  // ⭐️ REIMPLEMENTADO: Remove com Multitenancy
  async remove(usuarioId: string, empresaId: string): Promise<{ message: string }> {
    const result = await this.usuarioModel.deleteOne({
      _id: new Types.ObjectId(usuarioId),
      empresa: empresaId, // ⭐️ CORRIGIDO
    }).exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException(`Usuário com ID "${usuarioId}" não encontrado ou não pertence a esta empresa.`);
    }

    return { message: `Usuário com ID "${usuarioId}" removido com sucesso.` };
  }
}