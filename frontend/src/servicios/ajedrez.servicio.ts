import { cliente } from './cliente';
import type {
  BancoAjedrez,
  CierreAjedrez,
  DesenlaceAjedrez,
  PartidaAjedrez,
  PreguntaAjedrezEnJuego,
  PreguntaBancoAjedrez,
  RespuestaAjedrez,
} from '@/tipos';

const BASE = '/juegos/ajedrez';

export interface DatosBancoAjedrez {
  nombre: string;
  minutos: number;
  minimoPreguntas: number;
  preguntas: PreguntaBancoAjedrez[];
}

export const ajedrezServicio = {
  /* --- Bancos de preguntas (editor) --- */
  listarBancos() {
    return cliente.get<BancoAjedrez[]>(`${BASE}/bancos`).then((r) => r.data);
  },
  crearBanco(datos: DatosBancoAjedrez) {
    return cliente.post<BancoAjedrez>(`${BASE}/bancos`, datos).then((r) => r.data);
  },
  actualizarBanco(id: string, datos: DatosBancoAjedrez) {
    return cliente.put<BancoAjedrez>(`${BASE}/bancos/${id}`, datos).then((r) => r.data);
  },
  eliminarBanco(id: string) {
    return cliente.delete(`${BASE}/bancos/${id}`).then(() => undefined);
  },

  /* --- Partida (estudiante) --- */
  iniciar(moduloId: string) {
    return cliente.post<PartidaAjedrez>(`${BASE}/partida/${moduloId}`).then((r) => r.data);
  },
  pregunta(moduloId: string, partidaId: string, modo: 'normal' | 'rey' | 'critica') {
    return cliente
      .post<PreguntaAjedrezEnJuego>(`${BASE}/partida/${moduloId}/${partidaId}/pregunta`, { modo })
      .then((r) => r.data);
  },
  responder(moduloId: string, partidaId: string, preguntaId: string, opcionId: string) {
    return cliente
      .post<RespuestaAjedrez>(`${BASE}/partida/${moduloId}/${partidaId}/responder`, { preguntaId, opcionId })
      .then((r) => r.data);
  },
  terminar(moduloId: string, partidaId: string, desenlace: DesenlaceAjedrez) {
    return cliente
      .post<CierreAjedrez>(`${BASE}/partida/${moduloId}/${partidaId}/terminar`, { desenlace })
      .then((r) => r.data);
  },
};
