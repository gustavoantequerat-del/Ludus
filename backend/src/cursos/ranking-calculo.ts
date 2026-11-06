/**
 * Calculo del ranking de un curso, sin base de datos (se prueba solo).
 *
 * - Cuentan los modulos que califican y tienen un juego configurado.
 * - De cada modulo vale el mejor puntaje del estudiante (0 a 100).
 * - Termino el curso quien tiene resultado en todos esos modulos; su nota es
 *   el promedio de sus mejores puntajes, en escala de 10.
 * - Orden: mejor nota primero; si empatan, quien termino antes.
 */

export interface MejorPorModulo {
  estudianteId: string;
  moduloId: string;
  /** Mejor puntaje en ese modulo. */
  mejor: number;
  /** Cuando tuvo su primer resultado en ese modulo. */
  primero: Date;
}

export interface Inscrito {
  estudianteId: string;
  nombre: string;
}

export interface FilaRanking {
  posicion: number;
  estudianteId: string;
  nombre: string;
  /** Promedio de los mejores puntajes (0-100, un decimal). */
  promedio: number;
  /** Promedio en escala de 10 (un decimal). */
  nota: number;
  /** Cuando completo el ultimo modulo que le faltaba. */
  terminadoEn: Date;
}

export interface FilaEnProgreso {
  estudianteId: string;
  nombre: string;
  completados: number;
  /** Promedio de lo que lleva (null si no jugo ningun modulo que califica). */
  notaParcial: number | null;
}

const unDecimal = (n: number) => Math.round(n * 10) / 10;

export function calcularRanking(
  modulosQueCuentan: string[],
  inscritos: Inscrito[],
  mejores: MejorPorModulo[],
): { ranking: FilaRanking[]; enProgreso: FilaEnProgreso[] } {
  const cuentan = new Set(modulosQueCuentan);
  const porEstudiante = new Map<string, MejorPorModulo[]>();
  for (const fila of mejores) {
    if (!cuentan.has(fila.moduloId)) continue;
    const lista = porEstudiante.get(fila.estudianteId) ?? [];
    lista.push(fila);
    porEstudiante.set(fila.estudianteId, lista);
  }

  const terminados: Omit<FilaRanking, 'posicion'>[] = [];
  const enProgreso: FilaEnProgreso[] = [];
  for (const inscrito of inscritos) {
    const suyos = porEstudiante.get(inscrito.estudianteId) ?? [];
    const promedio = suyos.length
      ? suyos.reduce((suma, f) => suma + Math.min(100, Math.max(0, f.mejor)), 0) / suyos.length
      : null;
    if (cuentan.size > 0 && suyos.length === cuentan.size && promedio !== null) {
      terminados.push({
        estudianteId: inscrito.estudianteId,
        nombre: inscrito.nombre,
        promedio: unDecimal(promedio),
        nota: unDecimal(promedio / 10),
        terminadoEn: new Date(Math.max(...suyos.map((f) => f.primero.getTime()))),
      });
    } else {
      enProgreso.push({
        estudianteId: inscrito.estudianteId,
        nombre: inscrito.nombre,
        completados: suyos.length,
        notaParcial: promedio === null ? null : unDecimal(promedio / 10),
      });
    }
  }

  terminados.sort((a, b) => b.promedio - a.promedio || a.terminadoEn.getTime() - b.terminadoEn.getTime());
  enProgreso.sort((a, b) => b.completados - a.completados || a.nombre.localeCompare(b.nombre));
  return {
    ranking: terminados.map((fila, i) => ({ posicion: i + 1, ...fila })),
    enProgreso,
  };
}
