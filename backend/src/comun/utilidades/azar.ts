import { randomInt } from 'crypto';

/**
 * Azar del servidor para las preguntas: cada partida (y cada estudiante)
 * recibe su propio orden. Usa crypto.randomInt, que no tiene sesgo y no se
 * puede adivinar a partir de partidas anteriores.
 */

/** Copia mezclada con Fisher-Yates: todos los ordenes son igual de probables. */
export function mezclar<T>(lista: readonly T[]): T[] {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

/** Un elemento al azar (la lista no puede venir vacia). */
export function alAzar<T>(lista: readonly T[]): T {
  return lista[randomInt(lista.length)];
}
