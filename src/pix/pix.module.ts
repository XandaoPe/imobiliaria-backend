// src/pix/pix.module.ts - VERSÃO CORRIGIDA
import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { PixController } from './pix.controller';
import { PixService } from './pix.service';
import { TransacaoPix, TransacaoPixSchema } from './schemas/transacao-pix.schema';

import { FinanceiroModule } from '../financeiro/financeiro.module';
import { UsuarioModule } from '../usuario/usuario.module';
import { ClienteModule } from '../cliente/cliente.module';
import { EmpresaModule } from '../empresa/empresa.module';
import { UsuarioSchema } from 'src/usuario/schemas/usuario.schema';
import { ClienteSchema } from 'src/cliente/schemas/cliente.schema';
import { EmpresaSchema } from 'src/empresa/schemas/empresa.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: TransacaoPix.name, schema: TransacaoPixSchema }, // Usando TransacaoPix.name
            { name: 'Usuario', schema: UsuarioSchema },
            { name: 'Cliente', schema: ClienteSchema },
            { name: 'Empresa', schema: EmpresaSchema },
        ]),
        forwardRef(() => FinanceiroModule),
        UsuarioModule,
        ClienteModule,
        EmpresaModule,
    ],
    controllers: [PixController],
    providers: [PixService],
    exports: [PixService]
})
export class PixModule { }