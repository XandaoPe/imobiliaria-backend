// src/pix/pix.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { PixController } from './pix.controller';
import { PixService } from './pix.service';
import { TransacaoPix, TransacaoPixSchema } from './schemas/transacao-pix.schema';

import { FinanceiroModule } from '../financeiro/financeiro.module';
import { UsuarioModule } from '../usuario/usuario.module';
import { ClienteModule } from '../cliente/cliente.module';
import { EmpresaModule } from '../empresa/empresa.module';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: TransacaoPix.name, schema: TransacaoPixSchema }
        ]),
        forwardRef(() => FinanceiroModule),
        UsuarioModule,
        ClienteModule,
        EmpresaModule
    ],
    controllers: [PixController],
    providers: [PixService],
    exports: [PixService]
})
export class PixModule { }