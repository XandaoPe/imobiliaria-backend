// src/relatorios/relatorios.service.ts
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Agendamento, AgendamentoDocument } from 'src/agendamento/schemas/agendamento.schema';
import { Imovel } from 'src/imovel/schemas/imovel.schema';

@Injectable()
export class RelatoriosService {
    constructor(
        @InjectModel(Agendamento.name) private readonly agendamentoModel: Model<AgendamentoDocument>,
    ) { }

    /**
     * Conta agendamentos por status (PENDENTE, CONFIRMADO, etc.) no último mês.
     */
    async getAgendamentosPorStatus(empresaId: string): Promise<any> {
        try {
            const umMesAtras = new Date();
            umMesAtras.setMonth(umMesAtras.getMonth() - 1);

            // ⭐️ CORREÇÃO: Usar o tipo literal -1 no $sort
            const pipeline = [
                // 1. $match: Filtra os documentos
                {
                    $match: {
                        empresa: new Types.ObjectId(empresaId), // Filtro de Multitenancy
                        dataHora: { $gte: umMesAtras }, // Apenas agendamentos no último mês
                    },
                },
                // 2. $group: Agrupa os resultados
                {
                    $group: {
                        _id: '$status', // Agrupa pelo campo 'status'
                        total: { $sum: 1 }, // Conta quantos documentos em cada grupo
                    },
                },
                // 3. $sort: Ordena o resultado (Corrigido para tipo literal -1)
                {
                    $sort: { total: -1 as const }, // ⭐️ FORÇAR O TIPO LITERAL AQUI
                },
            ];

            return this.agendamentoModel.aggregate(pipeline).exec();
        } catch (error) {
            throw new InternalServerErrorException('Erro ao gerar relatório de agendamentos por status.');
        }
    }

    /**
     * Retorna a lista de imóveis que não possuem nenhuma foto cadastrada.
     */
    async getImoveisSemFoto(empresaId: string): Promise<Imovel[]> {
        try {
            const ImovelModel = this.agendamentoModel.db.model('Imovel') as Model<Imovel>;

            return ImovelModel.find({
                empresa: new Types.ObjectId(empresaId),
                disponivel: true,
                $or: [
                    { fotos: { $exists: false } },
                    { fotos: { $size: 0 } },
                ],
            })
                .select('titulo endereco fotos aluguel valor tipo')
                .exec();
        } catch (error) {
            throw new InternalServerErrorException('Erro ao buscar imóveis sem foto.');
        }
    }
}