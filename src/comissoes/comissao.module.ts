import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ComissaoController } from './comissao.controller';
import { ComissaoRegraController } from './comissao-regra.controller';
import { ComissaoService } from './comissao.service';
import { ComissaoRegraService } from './comissao-regra.service';
import { Comissao, ComissaoSchema } from './schemas/comissao.schema';
import { ComissaoRegra, ComissaoRegraSchema } from './schemas/comissaoRegra.schema';
import { Usuario, UsuarioSchema } from '../usuario/schemas/usuario.schema';
import { Financeiro, FinanceiroSchema } from '../financeiro/schemas/financeiro.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Comissao.name, schema: ComissaoSchema },
            { name: ComissaoRegra.name, schema: ComissaoRegraSchema },
            { name: Usuario.name, schema: UsuarioSchema },
            { name: Financeiro.name, schema: FinanceiroSchema },
        ]),
    ],
    controllers: [ComissaoController, ComissaoRegraController],
    providers: [ComissaoService, ComissaoRegraService],
    exports: [ComissaoService, ComissaoRegraService],
})
export class ComissaoModule { }