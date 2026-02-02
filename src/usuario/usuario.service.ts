// src/usuario/usuario.service.ts - VERSÃO CORRIGIDA COMPLETA
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

  // Método existente - Mantido
  async findByEmail(email: string): Promise<UsuarioDocument[]> {
    return this.usuarioModel.find({ email })
      .select('+senha')
      .populate('empresa')
      .exec();
  }

  // Método existente - Mantido
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

  // Método existente - Corrigido
  async create(createUsuarioDto: CreateUsuarioDto, empresaId: string): Promise<Usuario> {
    // 1. Hash da Senha
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

  // Método existente - Corrigido
  async findAll(
    empresaId: string,
    search?: string,
    perfil?: PerfisEnum,
    ativo?: string
  ): Promise<Usuario[]> {

    const filter: FilterQuery<UsuarioDocument> = {
      empresa: new Types.ObjectId(empresaId)
    };

    // 1. Filtro de Busca (Search)
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

  // Método existente - Corrigido
  async findOne(usuarioId: string, empresaId: string): Promise<Usuario> {
    const usuario = await this.usuarioModel
      .findOne({
        _id: new Types.ObjectId(usuarioId),
        empresa: new Types.ObjectId(empresaId),
      })
      .exec();

    if (!usuario) {
      throw new NotFoundException(`Usuário com ID "${usuarioId}" não encontrado ou não pertence a esta empresa.`);
    }
    return usuario.toObject();
  }

  // Método existente - Corrigido
  async update(usuarioId: string, updateUsuarioDto: any, empresaId: string): Promise<Usuario> {
    const { pushToken, ...dadosRestantes } = updateUsuarioDto;

    // 1. Prepara as atualizações básicas
    const updateQuery: any = { $set: dadosRestantes };

    // 2. Se houver senha, faz o hash
    if (dadosRestantes.senha) {
      updateQuery.$set.senha = await bcrypt.hash(dadosRestantes.senha, saltOrRounds);
    }

    // 3. Se houver um pushToken, usamos $addToSet
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

  // Método existente - Mantido (não precisa de .toObject())
  async remove(usuarioId: string, empresaId: string): Promise<{ message: string }> {
    const result = await this.usuarioModel.deleteOne({
      _id: new Types.ObjectId(usuarioId),
      empresa: new Types.ObjectId(empresaId),
    }).exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException(`Usuário com ID "${usuarioId}" não encontrado ou não pertence a esta empresa.`);
    }

    return { message: `Usuário com ID "${usuarioId}" removido com sucesso.` };
  }

  // Método existente - Mantido (não precisa de .toObject())
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

  // Método existente - Corrigido
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

  // 🔑 NOVO: Adicionar/atualizar chave PIX do usuário - CORRIGIDO
  async adicionarChavePix(usuarioId: string, chavePixDto: ChavePixDto, empresaId: string): Promise<Usuario> {
    // Validar formato da chave
    const formatoValido = this.pixValidationService.validarFormatoChavePix(chavePixDto.tipo, chavePixDto.chave);
    if (!formatoValido) {
      throw new BadRequestException(`Formato inválido para chave PIX do tipo ${chavePixDto.tipo}`);
    }

    // Verificar se chave já existe para outro usuário na mesma empresa
    const chaveExistente = await this.usuarioModel.findOne({
      _id: { $ne: new Types.ObjectId(usuarioId) },
      empresa: new Types.ObjectId(empresaId),
      'chavePix.chave': chavePixDto.chave,
      'chavePix.validado': true
    });

    if (chaveExistente) {
      throw new BadRequestException('Esta chave PIX já está cadastrada e validada para outro usuário nesta empresa');
    }

    // Se está definindo como preferencial, remover preferencial de outras chaves
    if (chavePixDto.preferencial) {
      await this.usuarioModel.updateOne(
        {
          _id: new Types.ObjectId(usuarioId),
          empresa: new Types.ObjectId(empresaId)
        },
        {
          $set: {
            'chavePix.preferencial': false,
            'chavesPixAlternativas.$[].preferencial': false
          }
        }
      );
    }

    const chavePixData = {
      tipo: chavePixDto.tipo,
      chave: chavePixDto.tipo === TipoChavePix.CPF || chavePixDto.tipo === TipoChavePix.CNPJ
        ? chavePixDto.chave.replace(/\D/g, '')
        : chavePixDto.chave,
      validado: false,
      preferencial: chavePixDto.preferencial || false,
      dataCadastro: new Date().toISOString().split('T')[0]
    };

    const usuarioAtualizado = await this.usuarioModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(usuarioId),
        empresa: new Types.ObjectId(empresaId)
      },
      {
        $set: {
          chavePix: chavePixData,
          'pixValidacaoStatus.tentativas': 0,
          'pixValidacaoStatus.bloqueadoAte': null
        }
      },
      { new: true }
    ).exec();

    if (!usuarioAtualizado) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Se a chave for do tipo EMAIL, enviar código de validação
    if (chavePixDto.tipo === TipoChavePix.EMAIL) {
      await this.enviarCodigoValidacaoEmail(usuarioAtualizado, chavePixDto.chave);
    }

    return usuarioAtualizado.toObject();
  }

  // 🔑 NOVO: Remover chave PIX do usuário - CORRIGIDO
  async removerChavePix(usuarioId: string, empresaId: string): Promise<Usuario> {
    const usuarioAtualizado = await this.usuarioModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(usuarioId),
        empresa: new Types.ObjectId(empresaId)
      },
      {
        $unset: {
          chavePix: '',
          'pixValidacaoStatus': ''
        },
        $set: { chavesPixAlternativas: [] }
      },
      { new: true }
    ).exec();

    if (!usuarioAtualizado) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return usuarioAtualizado.toObject();
  }

  // 🔑 NOVO: Validar chave PIX com código - CORRIGIDO
  async validarChavePix(usuarioId: string, validarDto: ValidarChavePixDto, empresaId: string): Promise<Usuario> {
    const usuario = await this.usuarioModel.findOne({
      _id: new Types.ObjectId(usuarioId),
      empresa: new Types.ObjectId(empresaId)
    });

    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (!usuario.chavePix) {
      throw new BadRequestException('Usuário não possui chave PIX cadastrada');
    }

    if (usuario.chavePix.validado) {
      throw new BadRequestException('Chave PIX já está validada');
    }

    // Verificar se está bloqueado
    const statusValidacao = usuario.pixValidacaoStatus || { tentativas: 0 };
    const bloqueio = this.pixValidationService.verificarBloqueioValidacao(
      statusValidacao.tentativas,
      statusValidacao.ultimaTentativaValidacao,
      statusValidacao.bloqueadoAte
    );

    if (bloqueio.bloqueado) {
      throw new BadRequestException(bloqueio.mensagem);
    }

    // TODO: Implementar lógica real de validação do código
    const codigoValido = validarDto.codigoValidacao === '123456';

    if (!codigoValido) {
      // Incrementar tentativas
      await this.usuarioModel.updateOne(
        { _id: usuario._id },
        {
          $inc: { 'pixValidacaoStatus.tentativas': 1 },
          $set: {
            'pixValidacaoStatus.ultimaTentativaValidacao': new Date().toISOString(),
            ...(statusValidacao.tentativas + 1 >= 10 && {
              'pixValidacaoStatus.bloqueadoAte': new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            })
          }
        }
      );

      throw new BadRequestException('Código de validação inválido');
    }

    // Validar chave
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
      throw new NotFoundException('Usuário não encontrado após atualização');
    }

    return usuarioAtualizado.toObject();
  }

  // 🔑 NOVO: Buscar usuário por chave PIX - CORRIGIDO
  async buscarPorChavePix(chave: string, empresaId: string): Promise<Usuario | null> {
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

  // 🔑 NOVO: Verificar se usuário tem chave PIX válida - CORRIGIDO
  async temChavePixValida(usuarioId: string, empresaId: string): Promise<boolean> {
    const usuario = await this.usuarioModel.findOne({
      _id: new Types.ObjectId(usuarioId),
      empresa: new Types.ObjectId(empresaId),
      'chavePix.validado': true
    }).select('chavePix').exec();

    return !!usuario?.chavePix?.chave;
  }

  // 🔑 NOVO: Enviar código de validação por email (simulado)
  private async enviarCodigoValidacaoEmail(usuario: UsuarioDocument, email: string): Promise<void> {
    console.log(`📧 Código de validação PIX enviado para ${email}: 123456`);
    console.log(`👤 Usuário: ${usuario.nome}`);
    console.log(`🏢 Empresa: ${usuario.empresa}`);
  }

  // 🔑 NOVO: Listar todos os usuários com chave PIX válida - CORRIGIDO
  async listarComChavePixValida(empresaId: string): Promise<Usuario[]> {
    const usuarios = await this.usuarioModel.find({
      empresa: new Types.ObjectId(empresaId),
      'chavePix.validado': true,
      'chavePix.chave': { $exists: true, $ne: null }
    })
      .select('nome email perfil chavePix')
      .exec();

    return usuarios.map(usuario => usuario.toObject());
  }
}