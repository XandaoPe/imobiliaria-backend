import { IsNotEmpty, IsString } from 'class-validator';

export class CreateLeadDto {
    @IsString()
    @IsNotEmpty({ message: 'O nome é obrigatório' })
    nome: string;

    @IsString()
    @IsNotEmpty({ message: 'O contato é obrigatório' })
    contato: string;

    @IsString()
    @IsNotEmpty({ message: 'O ID do imóvel é obrigatório' })
    imovel: string;

    @IsString()
    @IsNotEmpty({ message: 'O ID da empresa é obrigatório' })
    empresa: string;
}