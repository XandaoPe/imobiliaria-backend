// src/empresa/empresa.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Empresa, EmpresaDocument } from './schemas/empresa.schema';
import { CreateEmpresaDto } from './dto/create-empresa.dto';
import { UpdateEmpresaDto } from './dto/update-empresa.dto';

@Injectable()
export class EmpresaService {
  constructor(
    @InjectModel(Empresa.name) private empresaModel: Model<EmpresaDocument>,
  ) { }

  async create(createEmpresaDto: CreateEmpresaDto): Promise<Empresa> {
    const createdEmpresa = new this.empresaModel(createEmpresaDto);

    try {
      return await createdEmpresa.save();
    } catch (error) {
      if (error.code === 11000) {
        // Verifica qual campo falhou (pode ser nome ou cnpj)
        const campo = error.keyPattern && error.keyPattern.nome ? 'nome' :
          error.keyPattern && error.keyPattern.cnpj ? 'CNPJ' :
            'campo único';

        throw new BadRequestException(`Erro de Duplicação: O ${campo} informado já está cadastrado.`);
      }
      // Para outros erros (conexão, etc.), jogue o erro original ou um 500 genérico
      throw error;
    }
  }

  async findAll(): Promise<Empresa[]> {
    return this.empresaModel.find().exec();
  }

  async findOne(id: string): Promise<Empresa> {
    const empresa = await this.empresaModel.findById(id).exec();
    if (!empresa) {
      throw new NotFoundException(`Empresa com ID "${id}" não encontrada`);
    }
    return empresa;
  }

  async update(id: string, updateEmpresaDto: UpdateEmpresaDto): Promise<Empresa> {
    const updatedEmpresa = await this.empresaModel
      .findByIdAndUpdate(id, updateEmpresaDto, { new: true }) // new: true retorna o documento atualizado
      .exec();

    if (!updatedEmpresa) {
      throw new NotFoundException(`Empresa com ID "${id}" não encontrada`);
    }
    return updatedEmpresa;
  }

  async remove(id: string): Promise<any> {
    const result = await this.empresaModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Empresa com ID "${id}" não encontrada`);
    }
    return { message: `Empresa com ID "${id}" removida com sucesso` };
  }
}