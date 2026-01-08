import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FinanceiroController } from './financeiro.controller';
import { FinanceiroService } from './financeiro.service';
import { Financeiro, FinanceiroSchema } from './schemas/financeiro.schema';
import { FinanceiroPdfService } from './financeiro-pdf.service';
import { Empresa, EmpresaSchema } from 'src/empresa/schemas/empresa.schema'; // ⭐️ Importar Schema da Empresa

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Financeiro.name, schema: FinanceiroSchema },
            { name: Empresa.name, schema: EmpresaSchema }, // ⭐️ Adicionar aqui para o Service funcionar
        ]),
    ],
    controllers: [FinanceiroController],
    providers: [FinanceiroService, FinanceiroPdfService],
    exports: [FinanceiroService],
})
export class FinanceiroModule { }