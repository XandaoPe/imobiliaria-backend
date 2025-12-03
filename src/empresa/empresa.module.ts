// src/empresa/empresa.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmpresaService } from './empresa.service';
import { EmpresaController } from './empresa.controller';
import { Empresa, EmpresaSchema } from './schemas/empresa.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Empresa.name, schema: EmpresaSchema },
    ]),
  ],
  controllers: [EmpresaController],
  providers: [EmpresaService],
  exports: [EmpresaService], // Exporta o serviço para uso em outros módulos (ex: Login)
})
export class EmpresaModule { }