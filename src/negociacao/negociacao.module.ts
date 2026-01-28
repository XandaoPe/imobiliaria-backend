import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NegociacaoService } from './negociacao.service';
import { Negociacao, NegociacaoSchema } from './schemas/negociacao.schema';
import { ImovelModule } from '../imovel/imovel.module'; // Importante para o cross-service
import { NegociacaoController } from './negociacao.controller';
import { AgendamentoModule } from 'src/agendamento/agendamento.module';
import { FinanceiroModule } from 'src/financeiro/financeiro.module';
import { Counter, CounterSchema } from 'src/common/schemas/counter.schema';
import { Usuario, UsuarioSchema } from 'src/usuario/schemas/usuario.schema';
import { NotificacaoModule } from 'src/notificacao/notificacao.module';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Negociacao.name, schema: NegociacaoSchema },
            { name: Counter.name, schema: CounterSchema },
            { name: Usuario.name, schema: UsuarioSchema },
        ]),
        ImovelModule, // Permite usar o ImovelService aqui
        AgendamentoModule,
        FinanceiroModule,
        NotificacaoModule,
    ],
    controllers: [NegociacaoController],
    providers: [NegociacaoService],
    exports: [NegociacaoService],
})
export class NegociacaoModule { }