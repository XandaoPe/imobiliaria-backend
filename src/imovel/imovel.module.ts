// src/imovel/imovel.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ImovelService } from './imovel.service';
import { ImovelController } from './imovel.controller';
import { Imovel, ImovelSchema } from './schemas/imovel.schema';
import { AuthModule } from 'src/auth/auth.module';
import { UploadModule } from 'src/upload/upload.module'; // ⭐️ NOVO IMPORT
import { UsuarioModule } from 'src/usuario/usuario.module';
import { Usuario, UsuarioSchema } from 'src/usuario/schemas/usuario.schema';

@Module({
  imports: [
    MongooseModule.forFeature(
      [
        { name: Imovel.name, schema: ImovelSchema },
        { name: Usuario.name, schema: UsuarioSchema }
      ]
    ),
    AuthModule,
    UploadModule,
    UsuarioModule, // ⭐️ Adicionado para permitir o uso do FileInterceptor
  ],
  controllers: [ImovelController],
  providers: [ImovelService],
  exports: [ImovelService]
})
export class ImovelModule { }