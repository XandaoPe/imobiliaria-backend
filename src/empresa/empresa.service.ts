// src/empresa/empresa.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ChavePixEmpresa, Empresa, EmpresaDocument } from './schemas/empresa.schema';
import { CreateEmpresaDto } from './dto/create-empresa.dto';
import { ChavePixEmpresaDto, UpdateEmpresaDto } from './dto/update-empresa.dto';
import { UploadService } from 'src/upload/upload.service';

@Injectable()
export class EmpresaService {
  constructor(
    @InjectModel(Empresa.name) private empresaModel: Model<EmpresaDocument>,
    private readonly uploadService: UploadService, // ⭐️ Injetado
  ) { }

  async create(createEmpresaDto: CreateEmpresaDto): Promise<Empresa> {
    const createdEmpresa = new this.empresaModel(createEmpresaDto);
    try {
      return await createdEmpresa.save();
    } catch (error) {
      if (error.code === 11000) {
        const campo = error.keyPattern && error.keyPattern.nome ? 'nome' :
          error.keyPattern && error.keyPattern.cnpj ? 'CNPJ' : 'campo único';
        throw new BadRequestException(`Erro de Duplicação: O ${campo} informado já está cadastrado.`);
      }
      throw error;
    }
  }

  async findAll(search?: string, ativa?: string, isAdmGeral?: string): Promise<Empresa[]> {
    const query: any = {};
    if (search) {
      query.$or = [
        { nome: { $regex: search, $options: 'i' } },
        { cnpj: { $regex: search, $options: 'i' } },
        { fone: { $regex: search, $options: 'i' } },
      ];
    }
    if (ativa && ativa !== 'TODAS') query.ativa = ativa === 'true';
    if (isAdmGeral && isAdmGeral !== 'TODAS') query.isAdmGeral = isAdmGeral === 'true';

    return this.empresaModel.find(query).sort({ nome: 1 }).exec();
  }

  async findOne(id: string): Promise<Empresa> {
    const empresa = await this.empresaModel.findById(id).exec();
    if (!empresa) throw new NotFoundException(`Empresa não encontrada`);
    return empresa;
  }

  async update(id: string, updateEmpresaDto: UpdateEmpresaDto): Promise<Empresa> {
    const updatedEmpresa = await this.empresaModel
      .findByIdAndUpdate(id, updateEmpresaDto, { new: true })
      .exec();
    if (!updatedEmpresa) throw new NotFoundException(`Empresa não encontrada`);
    return updatedEmpresa;
  }

  async updateLogo(id: string, file: Express.Multer.File): Promise<Empresa> {
    const empresaExistente = await this.findOne(id);

    // Se já existia um logo, remove do Cloudinary
    if (empresaExistente.logo) {
      await this.uploadService.deleteImage(empresaExistente.logo).catch(() => null);
    }

    const url = await this.uploadService.uploadImage(file);

    const empresaAtualizada = await this.empresaModel
      .findByIdAndUpdate(id, { logo: url }, { new: true })
      .exec();

    if (!empresaAtualizada) {
      throw new NotFoundException(`Empresa com ID "${id}" não encontrada após o upload.`);
    }

    return empresaAtualizada;
  }

  // ⭐️ NOVO MÉTODO: UPDATE ASSINATURA
  async updateAssinatura(id: string, file: Express.Multer.File): Promise<Empresa> {
    const empresaExistente = await this.findOne(id);

    if (empresaExistente.assinatura_url) {
      await this.uploadService.deleteImage(empresaExistente.assinatura_url).catch(() => null);
    }

    const url = await this.uploadService.uploadImage(file);

    const empresaAtualizada = await this.empresaModel
      .findByIdAndUpdate(id, { assinatura_url: url }, { new: true })
      .exec();

    if (!empresaAtualizada) {
      throw new NotFoundException(`Empresa com ID "${id}" não encontrada após o upload.`);
    }

    return empresaAtualizada;
  }

  async remove(id: string): Promise<any> {
    const empresa = await this.findOne(id);
    // Limpa imagens da cloud antes de deletar a empresa
    if (empresa.logo) await this.uploadService.deleteImage(empresa.logo).catch(() => null);
    if (empresa.assinatura_url) await this.uploadService.deleteImage(empresa.assinatura_url).catch(() => null);

    const result = await this.empresaModel.findByIdAndDelete(id).exec();
    return { message: `Empresa removida com sucesso` };
  }

  async removeMany(ids: string[]): Promise<any> {
    const result = await this.empresaModel.deleteMany({ _id: { $in: ids } }).exec();
    return { message: `${result.deletedCount} empresas removidas com sucesso` };
  }

  // 🔑 NOVO: Método para atualizar chave PIX da empresa
  async atualizarChavePix(empresaId: string, chavePixDto: ChavePixEmpresaDto): Promise<Empresa> {
    const empresa = await this.findOne(empresaId);

    if (!chavePixDto.chave) {
      throw new BadRequestException('Chave PIX é obrigatória');
    }

    // Validar formato baseado no tipo
    if (chavePixDto.tipo === 'CNPJ') {
      const cnpjLimpo = chavePixDto.chave.replace(/\D/g, '');
      if (cnpjLimpo.length !== 14) {
        throw new BadRequestException('CNPJ deve ter 14 dígitos');
      }
      // Verificar se CNPJ bate com o cadastrado
      if (cnpjLimpo !== empresa.cnpj.replace(/\D/g, '')) {
        throw new BadRequestException('CNPJ da chave PIX deve ser o mesmo cadastrado na empresa');
      }
    }

    const chavePixData: ChavePixEmpresa = {
      tipo: chavePixDto.tipo || 'CNPJ',
      chave: chavePixDto.tipo === 'CNPJ'
        ? chavePixDto.chave!.replace(/\D/g, '') // Usando ! para indicar que não é null
        : chavePixDto.chave!,
      preferencial: chavePixDto.preferencial ?? true,
      dataCadastro: new Date().toISOString().split('T')[0]
    };

    const empresaAtualizada = await this.empresaModel.findByIdAndUpdate(
      empresaId,
      {
        $set: { chavePix: chavePixData },
        $addToSet: { chavesPixAlternativas: chavePixData.chave }
      },
      { new: true }
    ).exec();

    if (!empresaAtualizada) {
      throw new NotFoundException('Empresa não encontrada após atualização');
    }

    return empresaAtualizada;
  }

  // 🔑 NOVO: Método para buscar empresa por chave PIX
  async buscarPorChavePix(chave: string): Promise<Empresa | null> {
    const chaveLimpa = chave.replace(/\D/g, '');

    return this.empresaModel.findOne({
      $or: [
        { 'chavePix.chave': chave },
        { 'chavePix.chave': chaveLimpa },
        { chavesPixAlternativas: chave },
        { chavesPixAlternativas: chaveLimpa }
      ]
    }).exec();
  }

  // 🔑 NOVO: Método para obter chave PIX preferencial
  async obterChavePixPreferencial(empresaId: string): Promise<{ chave: string; tipo: string } | null> {
    const empresa = await this.findOne(empresaId);

    if (empresa.chavePix?.chave) {
      return {
        chave: empresa.chavePix.chave,
        tipo: empresa.chavePix.tipo
      };
    }

    return null;
  }

  // 🔑 NOVO: Método para adicionar chave PIX alternativa
  async adicionarChavePixAlternativa(empresaId: string, chave: string): Promise<Empresa> {
    const empresaAtualizada = await this.empresaModel.findByIdAndUpdate(
      empresaId,
      { $addToSet: { chavesPixAlternativas: chave } },
      { new: true }
    ).exec();

    if (!empresaAtualizada) {
      throw new NotFoundException('Empresa não encontrada');
    }

    return empresaAtualizada;
  }

  // 🔑 NOVO: Método para remover chave PIX
  async removerChavePix(empresaId: string): Promise<Empresa> {
    const empresaAtualizada = await this.empresaModel.findByIdAndUpdate(
      empresaId,
      {
        $unset: { chavePix: '' },
        $set: { chavesPixAlternativas: [] }
      },
      { new: true }
    ).exec();

    if (!empresaAtualizada) {
      throw new NotFoundException('Empresa não encontrada');
    }

    return empresaAtualizada;
  }

}