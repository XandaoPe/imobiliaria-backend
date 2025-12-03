// src/imovel/imovel.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ImovelService } from './imovel.service';
import { ImovelController } from './imovel.controller';
import { Imovel, ImovelSchema } from './schemas/imovel.schema';
import { AuthModule } from '../auth/auth.module'; // Necessário para proteger rotas

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Imovel.name, schema: ImovelSchema }]),
    AuthModule, // Importa o módulo de autenticação para usar os Guards e o token
  ],
  controllers: [ImovelController],
  providers: [ImovelService],
})
export class ImovelModule { }