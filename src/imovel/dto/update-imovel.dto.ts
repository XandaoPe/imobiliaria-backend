import { PartialType } from '@nestjs/swagger';
import { CreateImovelDto } from './create-imovel.dto';

export class UpdateImovelDto extends PartialType(CreateImovelDto) { }