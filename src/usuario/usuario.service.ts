// src/usuario/usuario.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { Usuario, UsuarioDocument } from './schemas/usuario.schema';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';

// Define quantos "rounds" de hash o bcrypt fará
const saltOrRounds = 10;

@Injectable()
export class UsuarioService {
  constructor(
    @InjectModel(Usuario.name) private usuarioModel: Model<UsuarioDocument>,
  ) { }

  // ⭐️ BUSCA UTILIZADA PELO LOGIN/AUTH
  async findOneByEmailAndEmpresa(email: string, empresaId?: string): Promise<UsuarioDocument | null> {
    return this.usuarioModel.findOne({ email, empresa: empresaId }).exec();
  }

  async create(createUsuarioDto: CreateUsuarioDto): Promise<Usuario> {
    // 1. Hash da Senha
    const hashedPassword = await bcrypt.hash(createUsuarioDto.senha, saltOrRounds);

    // 2. Cria o novo usuário com a senha hasheada
    const createdUsuario = new this.usuarioModel({
      ...createUsuarioDto,
      senha: hashedPassword,
      // O 'empresaId' vem do DTO e será um string/ObjectId
      empresa: createUsuarioDto.empresaId,
    });

    try {
      return createdUsuario.save();
    } catch (error) {
      // Trata erro de índice único (email + empresa)
      if (error.code === 11000) {
        throw new BadRequestException('Email já cadastrado para esta empresa.');
      }
      throw error;
    }
  }

  // Métodos CRUD básicos para referência (ajuste o findAll e findOne para Multitenancy depois!)
  async findAll(): Promise<Usuario[]> {
    return this.usuarioModel.find().exec();
  }

  async findOne(id: string): Promise<Usuario> {
    const usuario = await this.usuarioModel.findById(id).exec();
    if (!usuario) {
      throw new NotFoundException(`Usuário com ID "${id}" não encontrado`);
    }
    return usuario;
  }

  // ... (outros métodos update/remove)
}