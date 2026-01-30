import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { PerfisEnum } from '../../usuario/schemas/usuario.schema';
import { CargoRegra } from '../schemas/comissaoRegra.schema';

@Injectable()
export class PerfilToCargoPipe implements PipeTransform {
    private readonly mapeamento: Record<PerfisEnum, CargoRegra> = {
        [PerfisEnum.CORRETOR]: CargoRegra.CORRETOR,
        [PerfisEnum.GERENTE]: CargoRegra.GERENTE,
        [PerfisEnum.ADM_GERAL]: CargoRegra.ADM_GERAL,
        [PerfisEnum.SUPORTE]: CargoRegra.OUTRO,
    };

    transform(perfil: PerfisEnum): CargoRegra {
        const cargo = this.mapeamento[perfil];

        if (!cargo) {
            throw new BadRequestException(`Perfil ${perfil} não tem mapeamento para cargo`);
        }

        return cargo;
    }
}