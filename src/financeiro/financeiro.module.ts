import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FinanceiroController } from './financeiro.controller';
import { FinanceiroService } from './financeiro.service';
import { Financeiro, FinanceiroSchema } from './schemas/financeiro.schema';
import { FinanceiroPdfService } from './financeiro-pdf.service';
import { Empresa, EmpresaSchema } from 'src/empresa/schemas/empresa.schema'; // ⭐️ Importar Schema da Empresa
import { Cliente, ClienteSchema } from 'src/cliente/schemas/cliente.schema';
import { ConfiguracaoModule } from 'src/configuracao/configuracao.module';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Financeiro.name, schema: FinanceiroSchema },
            { name: Cliente.name, schema: ClienteSchema },
            { name: Empresa.name, schema: EmpresaSchema }, // ⭐️ Adicionar aqui para o Service funcionar
        ]),
        ConfiguracaoModule,
    ],
    controllers: [FinanceiroController],
    providers: [FinanceiroService, FinanceiroPdfService],
    exports: [FinanceiroService],
})
export class FinanceiroModule { }