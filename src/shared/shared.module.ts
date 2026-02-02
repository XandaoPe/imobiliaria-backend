// src/shared/shared.module.ts (ATUALIZADO)
import { Module, Global } from '@nestjs/common';
import { PixValidationService } from './services/pix-validation.service';

@Global() // Torna o módulo global para ser usado em toda a aplicação
@Module({
    providers: [PixValidationService],
    exports: [PixValidationService],
})
export class SharedModule { }