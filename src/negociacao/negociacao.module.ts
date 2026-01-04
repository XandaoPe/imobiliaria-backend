import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NegociacaoService } from './negociacao.service';
import { Negociacao, NegociacaoSchema } from './schemas/negociacao.schema';
import { ImovelModule } from '../imovel/imovel.module'; // Importante para o cross-service
import { NegociacaoController } from './negociacao.controller';
import { AgendamentoModule } from 'src/agendamento/agendamento.module';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Negociacao.name, schema: NegociacaoSchema }]),
        ImovelModule, // Permite usar o ImovelService aqui
        AgendamentoModule,
    ],
    controllers: [NegociacaoController],
    providers: [NegociacaoService],
    exports: [NegociacaoService],
})
export class NegociacaoModule { }