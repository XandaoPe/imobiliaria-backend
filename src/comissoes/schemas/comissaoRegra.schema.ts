import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ComissaoRegraDocument = ComissaoRegra & Document;

export enum TipoNegocioRegra {
    VENDA = 'VENDA',
    ALUGUEL = 'ALUGUEL',
    AMBOS = 'AMBOS',
}

export enum TipoCalculoRegra {
    PERCENTUAL = 'PERCENTUAL',
    FIXO = 'FIXO',
    MISTO = 'MISTO',
}

export enum CargoRegra {
    CORRETOR = 'CORRETOR',
    GERENTE = 'GERENTE',
    ADM_GERAL = 'ADM_GERAL',
    OUTRO = 'OUTRO',
}

export enum NivelRegra {
    JUNIOR = 'JUNIOR',
    PLENO = 'PLENO',
    SENIOR = 'SENIOR',
    ESPECIAL = 'ESPECIAL',
}

@Schema({ timestamps: true, collection: 'comissao_regras' })
export class ComissaoRegra {
    @Prop({ required: true, trim: true })
    nome: string;

    @Prop({
        type: String,
        required: true,
        enum: TipoNegocioRegra,
        default: TipoNegocioRegra.AMBOS
    })
    tipoNegocio: TipoNegocioRegra;

    @Prop({
        type: [String],
        enum: CargoRegra,
        default: []
    })
    cargo: CargoRegra[];

    @Prop({
        type: [String],
        enum: NivelRegra,
        default: []
    })
    nivel: NivelRegra[];

    @Prop({
        required: true,
        min: 0,
        max: 100,
        default: 0
    })
    percentual: number;

    @Prop({ min: 0, default: 0 })
    valorFixo?: number;

    @Prop({
        type: String,
        required: true,
        enum: TipoCalculoRegra,
        default: TipoCalculoRegra.PERCENTUAL
    })
    tipoCalculo: TipoCalculoRegra;

    @Prop({ required: true, default: 1 })
    prioridade: number;

    @Prop({ default: true })
    ativo: boolean;

    @Prop()
    dataInicio?: Date;

    @Prop()
    dataFim?: Date;

    @Prop({ trim: true })
    observacao?: string;

    @Prop({ type: Types.ObjectId, ref: 'Usuario', required: true })
    criadoPor: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'Usuario' })
    atualizadoPor?: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'Empresa', required: true })
    empresa: Types.ObjectId;
}

export const ComissaoRegraSchema = SchemaFactory.createForClass(ComissaoRegra);

// Índices para performance
ComissaoRegraSchema.index({ empresa: 1, prioridade: -1 });
ComissaoRegraSchema.index({ empresa: 1, ativo: 1 });