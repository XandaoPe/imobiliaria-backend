// src/cliente/cliente.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClienteService } from './cliente.service';
import { ClienteController } from './cliente.controller';
import { Cliente, ClienteSchema } from './schemas/cliente.schema';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeatureAsync([
      {
        name: Cliente.name,
        useFactory: () => {
          const schema = ClienteSchema;
          // 🔑 Multitenancy: CPF e Email são únicos DENTRO de cada empresa
          schema.index({ cpf: 1, empresa: 1 }, { unique: true, sparse: true });
          schema.index({ email: 1, empresa: 1 }, { unique: true, sparse: true });
          return schema;
        },
      },
    ]),
    AuthModule,
  ],
  controllers: [ClienteController],
  providers: [ClienteService],
})
export class ClienteModule { }