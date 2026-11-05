import { randomInt } from 'crypto';

/**
 * Codigo con el que un estudiante nuevo se registra en su institucion.
 *
 * 8 caracteres sin los que se confunden al dictarlos (0/O, 1/I/L). Se guarda
 * sin guion y se muestra como ABCD-EFGH; al recibirlo se aceptan minusculas,
 * espacios y guiones.
 */
const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const LARGO_CODIGO = 8;

export function generarCodigo(): string {
  let codigo = '';
  for (let i = 0; i < LARGO_CODIGO; i++) codigo += ALFABETO[randomInt(ALFABETO.length)];
  return codigo;
}

export function normalizarCodigo(texto: string): string {
  return texto.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function mostrarCodigo(codigo: string): string {
  return `${codigo.slice(0, 4)}-${codigo.slice(4)}`;
}
