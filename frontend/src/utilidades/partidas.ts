import { resultadosServicio } from '@/servicios/resultados.servicio';
import type { FinDePartida } from '@/tipos';

/** Registra el intento de un juego ludico (sin nota: el modulo no califica). */
export async function guardarIntentoLudico(moduloId: string, puntaje: number): Promise<FinDePartida> {
  const resultado = await resultadosServicio.crear(moduloId, puntaje);
  return { puntaje: resultado.puntaje, nota: resultado.nota };
}

export function formatearSegundos(total: number): string {
  const m = Math.floor(total / 60);
  return `${m}:${String(total % 60).padStart(2, '0')}`;
}
