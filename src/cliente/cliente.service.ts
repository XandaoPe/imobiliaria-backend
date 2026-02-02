// src/cliente/cliente.service.ts - VERSÃO CORRIGIDA COMPLETA
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { Cliente, ClienteDocument } from './schemas/cliente.schema';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { ChavePixDto, TipoChavePix, ValidarChavePixDto } from 'src/shared/dto/chave-pix.dto';
import { PixValidationService } from 'src/shared/services/pix-validation.service';

@Injectable()
export class ClienteService {
    constructor(
        @InjectModel(Cliente.name) private clienteModel: Model<ClienteDocument>,
        private readonly pixValidationService: PixValidationService,
    ) { }

    // Métodos existentes - Mantidos e corrigidos se necessário
    async create(createClienteDto: CreateClienteDto, empresaId: string): Promise<Cliente> {
        const createdCliente = new this.clienteModel({
            ...createClienteDto,
            empresa: new Types.ObjectId(empresaId),
        });

        try {
            const savedCliente = await createdCliente.save();
            return savedCliente.toObject();
        } catch (error) {
            if (error.code === 11000) {
                const campo = error.keyPattern?.cpf ? 'CPF' : error.keyPattern?.email ? 'Email' : 'campo único';
                throw new BadRequestException(`Erro de Duplicação: O ${campo} informado já está cadastrado nesta empresa.`);
            }
            throw error;
        }
    }

    async findAll(empresaId: string, search?: string, status?: string): Promise<Cliente[]> {
        const filter: FilterQuery<ClienteDocument> = {
            empresa: new Types.ObjectId(empresaId)
        };

        if (status && (status === 'ATIVO' || status === 'INATIVO')) {
            filter.status = status;
        }

        if (search) {
            const regex = new RegExp(search, 'i');
            filter.$or = [
                { nome: { $regex: regex } },
                { cpf: { $regex: regex } },
                { email: { $regex: regex } },
                { telefone: { $regex: regex } },
                { status: { $regex: regex } },
                { perfil: { $regex: regex } },
                { observacoes: { $regex: regex } },
                { endereco: { $regex: regex } },
                { cidade: { $regex: regex } },
            ];
        }

        const clientes = await this.clienteModel.find(filter).sort({ nome: 1 }).exec();
        return clientes.map(cliente => cliente.toObject());
    }

    async findOne(clienteId: string, empresaId: string): Promise<Cliente> {
        const cliente = await this.clienteModel.findOne({
            _id: new Types.ObjectId(clienteId),
            empresa: new Types.ObjectId(empresaId),
        }).exec();

        if (!cliente) {
            throw new NotFoundException(`Cliente não encontrado ou não pertence a esta empresa.`);
        }
        return cliente.toObject();
    }

    async update(clienteId: string, updateClienteDto: UpdateClienteDto, empresaId: string): Promise<Cliente> {
        const updatedCliente = await this.clienteModel.findOneAndUpdate(
            {
                _id: new Types.ObjectId(clienteId),
                empresa: new Types.ObjectId(empresaId)
            },
            updateClienteDto,
            { new: true },
        ).exec();

        if (!updatedCliente) {
            throw new NotFoundException(`Cliente não encontrado ou não pertence a esta empresa.`);
        }
        return updatedCliente.toObject();
    }

    async remove(clienteId: string, empresaId: string): Promise<any> {
        const result = await this.clienteModel.deleteOne({
            _id: new Types.ObjectId(clienteId),
            empresa: new Types.ObjectId(empresaId)
        }).exec();

        if (result.deletedCount === 0) {
            throw new NotFoundException(`Cliente não encontrado.`);
        }
        return { message: 'Cliente removido com sucesso' };
    }

    // 🔑 NOVO: Adicionar/atualizar chave PIX do cliente - CORRIGIDO
    async adicionarChavePix(clienteId: string, chavePixDto: ChavePixDto, empresaId: string): Promise<Cliente> {
        // REMOVIDA A VALIDAÇÃO DE FORMATO
        // Não há mais validação de formato - aceita qualquer valor

        // Verificar se chave já existe para outro cliente na mesma empresa
        const chaveExistente = await this.clienteModel.findOne({
            _id: { $ne: new Types.ObjectId(clienteId) },
            empresa: new Types.ObjectId(empresaId),
            'chavePix.chave': chavePixDto.chave,
        });

        if (chaveExistente) {
            throw new BadRequestException('Esta chave PIX já está cadastrada para outro cliente nesta empresa');
        }

        const chavePixData = {
            tipo: chavePixDto.tipo,
            chave: chavePixDto.chave, // ACEITA QUALQUER VALOR
            validado: true, // AGORA JÁ VAI DIRETO COMO VALIDADO
            preferencial: chavePixDto.preferencial || false,
            dataCadastro: new Date().toISOString().split('T')[0],
            dataValidacao: new Date().toISOString().split('T')[0] // DATA DE VALIDAÇÃO DIRETA
        };

        const clienteAtualizado = await this.clienteModel.findOneAndUpdate(
            {
                _id: new Types.ObjectId(clienteId),
                empresa: new Types.ObjectId(empresaId)
            },
            {
                $set: {
                    chavePix: chavePixData,
                }
            },
            { new: true }
        ).exec();

        if (!clienteAtualizado) {
            throw new NotFoundException('Cliente não encontrado');
        }

        return clienteAtualizado.toObject();
    }

    // 🔑 NOVO: Remover chave PIX do cliente
    async removerChavePix(clienteId: string, empresaId: string): Promise<Cliente> {
        const clienteAtualizado = await this.clienteModel.findOneAndUpdate(
            {
                _id: new Types.ObjectId(clienteId),
                empresa: new Types.ObjectId(empresaId)
            },
            {
                $unset: {
                    chavePix: ''
                },
            },
            { new: true }
        ).exec();

        if (!clienteAtualizado) {
            throw new NotFoundException('Cliente não encontrado');
        }

        return clienteAtualizado.toObject();
    }

    // 🔑 NOVO: Validar chave PIX do cliente - CORRIGIDO
    async validarChavePix(clienteId: string, validarDto: ValidarChavePixDto, empresaId: string): Promise<Cliente> {
        const cliente = await this.clienteModel.findOne({
            _id: new Types.ObjectId(clienteId),
            empresa: new Types.ObjectId(empresaId)
        });

        if (!cliente) {
            throw new NotFoundException('Cliente não encontrado');
        }

        if (!cliente.chavePix) {
            throw new BadRequestException('Cliente não possui chave PIX cadastrada');
        }

        if (cliente.chavePix.validado) {
            throw new BadRequestException('Chave PIX já está validada');
        }

        // Verificar se está bloqueado
        const statusValidacao = cliente.pixValidacaoStatus || { tentativas: 0 };
        const bloqueio = this.pixValidationService.verificarBloqueioValidacao(
            statusValidacao.tentativas,
            statusValidacao.ultimaTentativaValidacao,
            statusValidacao.bloqueadoAte
        );

        if (bloqueio.bloqueado) {
            throw new BadRequestException(bloqueio.mensagem);
        }

        // TODO: Implementar lógica real de validação
        const codigoValido = validarDto.codigoValidacao === '123456';

        if (!codigoValido) {
            await this.clienteModel.updateOne(
                { _id: cliente._id },
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

        const clienteAtualizado = await this.clienteModel.findOneAndUpdate(
            { _id: cliente._id },
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

        if (!clienteAtualizado) {
            throw new NotFoundException('Cliente não encontrado após atualização');
        }

        return clienteAtualizado.toObject();
    }

    // 🔑 NOVO: Buscar cliente por chave PIX - CORRIGIDO
    async buscarPorChavePix(chave: string, empresaId: string): Promise<Cliente | null> {
        const cliente = await this.clienteModel.findOne({
            empresa: new Types.ObjectId(empresaId),
            'chavePix.chave': chave // BUSCA DIRETA, SEM LIMPEZA DE CARACTERES
        }).exec();

        return cliente ? cliente.toObject() : null;
    }

    // 🔑 NOVO: Verificar se cliente tem chave PIX
    async temChavePix(clienteId: string, empresaId: string): Promise<boolean> {
        const cliente = await this.clienteModel.findOne({
            _id: new Types.ObjectId(clienteId),
            empresa: new Types.ObjectId(empresaId),
            'chavePix.chave': { $exists: true, $ne: null }
        }).select('chavePix').exec();

        return !!cliente?.chavePix?.chave;
    }

    // 🔑 NOVO: Enviar código de validação por email (simulado)
    private async enviarCodigoValidacaoEmail(cliente: ClienteDocument, email: string): Promise<void> {
        console.log(`📧 Código de validação PIX enviado para ${email}: 123456`);
        console.log(`👤 Cliente: ${cliente.nome}`);
        console.log(`🏢 Empresa: ${cliente.empresa}`);
    }

    // 🔑 NOVO: Listar todos os clientes com chave PIX válida - CORRIGIDO
    async listarComChavePix(empresaId: string): Promise<Cliente[]> {
        const clientes = await this.clienteModel.find({
            empresa: new Types.ObjectId(empresaId),
            'chavePix.chave': { $exists: true, $ne: null }
        })
            .select('nome email telefone chavePix')
            .exec();

        return clientes.map(cliente => cliente.toObject());
    }
}