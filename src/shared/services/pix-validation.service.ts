// src/shared/services/pix-validation.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { TipoChavePix } from '../dto/chave-pix.dto';

@Injectable()
export class PixValidationService {

    validarFormatoChavePix(tipo: TipoChavePix, chave: string): boolean {
        switch (tipo) {
            case TipoChavePix.CPF:
                return this.validarCPF(chave);
            case TipoChavePix.CNPJ:
                return this.validarCNPJ(chave);
            case TipoChavePix.EMAIL:
                return this.validarEmail(chave);
            case TipoChavePix.TELEFONE:
                return this.validarTelefone(chave);
            case TipoChavePix.CHAVE_ALEATORIA:
                return this.validarChaveAleatoria(chave);
            default:
                return false;
        }
    }

    private validarCPF(cpf: string): boolean {
        const cleanCPF = cpf.replace(/\D/g, '');

        // Verifica se tem 11 dígitos
        if (cleanCPF.length !== 11) return false;

        // Verifica se todos os dígitos são iguais
        if (/^(\d)\1{10}$/.test(cleanCPF)) return false;

        // Validação dos dígitos verificadores
        let soma = 0;
        let resto;

        // Primeiro dígito verificador
        for (let i = 1; i <= 9; i++) {
            soma += parseInt(cleanCPF.substring(i - 1, i)) * (11 - i);
        }
        resto = (soma * 10) % 11;
        if (resto === 10 || resto === 11) resto = 0;
        if (resto !== parseInt(cleanCPF.substring(9, 10))) return false;

        // Segundo dígito verificador
        soma = 0;
        for (let i = 1; i <= 10; i++) {
            soma += parseInt(cleanCPF.substring(i - 1, i)) * (12 - i);
        }
        resto = (soma * 10) % 11;
        if (resto === 10 || resto === 11) resto = 0;
        if (resto !== parseInt(cleanCPF.substring(10, 11))) return false;

        return true;
    }

    private validarCNPJ(cnpj: string): boolean {
        const cleanCNPJ = cnpj.replace(/\D/g, '');

        if (cleanCNPJ.length !== 14) return false;

        // Elimina CNPJs inválidos conhecidos
        if (/^(\d)\1{13}$/.test(cleanCNPJ)) return false;

        // Valida DVs
        let tamanho = cleanCNPJ.length - 2;
        let numeros = cleanCNPJ.substring(0, tamanho);
        const digitos = cleanCNPJ.substring(tamanho);
        let soma = 0;
        let pos = tamanho - 7;

        for (let i = tamanho; i >= 1; i--) {
            soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
            if (pos < 2) pos = 9;
        }

        let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
        if (resultado !== parseInt(digitos.charAt(0))) return false;

        tamanho = tamanho + 1;
        numeros = cleanCNPJ.substring(0, tamanho);
        soma = 0;
        pos = tamanho - 7;

        for (let i = tamanho; i >= 1; i--) {
            soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
            if (pos < 2) pos = 9;
        }

        resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
        if (resultado !== parseInt(digitos.charAt(1))) return false;

        return true;
    }

    private validarEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    private validarTelefone(telefone: string): boolean {
        // Formato: +5511999999999 (código país + DDD + número)
        const telefoneRegex = /^\+\d{1,3}\d{10,11}$/;
        return telefoneRegex.test(telefone);
    }

    private validarChaveAleatoria(chave: string): boolean {
        // Chave aleatória deve ter entre 32 e 36 caracteres (UUID-like)
        return chave.length >= 32 && chave.length <= 36;
    }

    formatarChaveParaExibicao(tipo: TipoChavePix, chave: string): string {
        switch (tipo) {
            case TipoChavePix.CPF:
                return chave.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
            case TipoChavePix.CNPJ:
                return chave.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
            case TipoChavePix.TELEFONE:
                const codigoPais = chave.substring(0, 3);
                const ddd = chave.substring(3, 5);
                const parte1 = chave.substring(5, 10);
                const parte2 = chave.substring(10);
                return `${codigoPais} (${ddd}) ${parte1}-${parte2}`;
            default:
                return chave;
        }
    }

    gerarCodigoValidacao(): string {
        // Gera código de 6 dígitos
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    verificarBloqueioValidacao(tentativas: number, ultimaTentativa?: string, bloqueadoAte?: string): { bloqueado: boolean; mensagem?: string } {
        // Se excedeu 5 tentativas em menos de 1 hora
        if (tentativas >= 5 && ultimaTentativa) {
            const ultimaTentativaDate = new Date(ultimaTentativa);
            const umaHoraAtras = new Date(Date.now() - 60 * 60 * 1000);

            if (ultimaTentativaDate > umaHoraAtras) {
                return {
                    bloqueado: true,
                    mensagem: 'Muitas tentativas. Aguarde 1 hora para tentar novamente.'
                };
            }
        }

        // Se está bloqueado até uma data específica
        if (bloqueadoAte) {
            const bloqueadoAteDate = new Date(bloqueadoAte);
            if (bloqueadoAteDate > new Date()) {
                return {
                    bloqueado: true,
                    mensagem: `Validação bloqueada até ${bloqueadoAteDate.toLocaleString()}`
                };
            }
        }

        return { bloqueado: false };
    }
}