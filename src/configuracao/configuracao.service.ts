// src/configuracao/configuracao.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Configuracao, ConfiguracaoDocument } from './schemas/configuracao.schema';
import { CreateConfiguracaoDto } from './dto/create-configuracao.dto';

@Injectable()
export class ConfiguracaoService {
    constructor(
        @InjectModel(Configuracao.name) private configModel: Model<ConfiguracaoDocument>,
    ) { }

    async upsert(dto: CreateConfiguracaoDto, empresaId: string): Promise<Configuracao> {
        // Busca se já existe a chave para a empresa, se sim atualiza, se não cria (Upsert)
        return this.configModel.findOneAndUpdate(
            { chave: dto.chave, empresa: new Types.ObjectId(empresaId) },
            { ...dto, empresa: new Types.ObjectId(empresaId) },
            { new: true, upsert: true }
        ).exec();
    }

    async findAll(empresaId: string): Promise<Configuracao[]> {
        return this.configModel.find({ empresa: new Types.ObjectId(empresaId) }).exec();
    }

    async findByChave(chave: string, empresaId: string): Promise<Configuracao> {
        const config = await this.configModel.findOne({
            chave,
            empresa: new Types.ObjectId(empresaId)
        }).exec();

        if (!config) throw new NotFoundException(`Configuração ${chave} não encontrada.`);
        return config;
    }
}