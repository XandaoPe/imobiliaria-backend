// src/cliente/cliente.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClienteService } from './cliente.service';
import { ClienteController } from './cliente.controller';
import { Cliente, ClienteSchema } from './schemas/cliente.schema';
import { AuthModule } from '../auth/auth.module';
import { SharedModule } from 'src/shared/shared.module';

@Module({
  imports: [
    MongooseModule.forFeatureAsync([
      {
        name: Cliente.name,
        useFactory: () => {
          const schema = ClienteSchema;
          // 🔑 Multitenancy: CPF e Email são únicos DENTRO de cada empresa
          return schema;
        },
      },
    ]),
    AuthModule,
    SharedModule,
  ],
  controllers: [ClienteController],
  providers: [ClienteService],
  exports: [ClienteService]
})
export class ClienteModule { }