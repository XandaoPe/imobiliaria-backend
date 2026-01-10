// src/empresa/empresa.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Empresa, EmpresaDocument } from './schemas/empresa.schema';
import { CreateEmpresaDto } from './dto/create-empresa.dto';
import { UpdateEmpresaDto } from './dto/update-empresa.dto';
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
}