import { cliente } from './cliente';
import type {
  CalificacionPartida,
  ConfiguracionJuego,
  DecisionCumplimiento,
  Juego,
  PartidaCumplimiento,
  PartidaMahjong,
  PartidaMemorama,
  PartidaRunner,
  ResultadoRunner,
  Velocidad,
  VeredictoCaso,
  VeredictoRunner,
} from '@/tipos';

export interface DatosConfiguracionJuego {
  juegoId: string;
  titulo: string;
  instrucciones?: string;
  velocidad: Velocidad;
  tiempoLimiteSegundos: number;
  paresContenido: number;
  intentosPermitidos: number;
  puntajeMaximo: number;
  califica?: boolean;
  ajustes?: Record<string, unknown>;
}

const RUNNER = '/juegos/runner-narrativo/partida';

export const juegosServicio = {
  listarCatalogo() {
    return cliente.get<Juego[]>('/juegos').then((r) => r.data);
  },
  obtenerConfiguracion(moduloId: string) {
    // El backend responde sin cuerpo (200, Content-Length 0) cuando el modulo
    // no tiene juego configurado; axios lo entrega como "" en vez de null.
    return cliente
      .get<ConfiguracionJuego | null>(`/juegos/modulos/${moduloId}/configuracion`)
      .then((r) => r.data || null);
  },
  /* --- Partida de un juego con mecanica real --- */
  armarPartida(moduloId: string) {
    return cliente.get<PartidaCumplimiento>(`/juegos/partida/${moduloId}`).then((r) => r.data);
  },
  verificarCaso(casoId: string, decision: DecisionCumplimiento) {
    return cliente
      .post<VeredictoCaso>('/juegos/partida/verificar', { casoId, decision })
      .then((r) => r.data);
  },
  terminarPartida(
    moduloId: string,
    respuestas: { casoId: string; decision: DecisionCumplimiento }[],
  ) {
    return cliente
      .post<CalificacionPartida>(`/juegos/partida/${moduloId}/terminar`, { respuestas })
      .then((r) => r.data);
  },

  /* --- Juegos ludicos: la partida; el intento se guarda con resultadosServicio --- */
  partidaMemorama(moduloId: string) {
    return cliente.get<PartidaMemorama>(`/juegos/memorama/partida/${moduloId}`).then((r) => r.data);
  },
  partidaMahjong(moduloId: string) {
    return cliente.get<PartidaMahjong>(`/juegos/mahjong/partida/${moduloId}`).then((r) => r.data);
  },

  /* --- Runner Narrativo --- */
  partidaRunner(moduloId: string) {
    return cliente.get<PartidaRunner>(`${RUNNER}/${moduloId}`).then((r) => r.data);
  },
  verificarRunner(moduloId: string, preguntaId: string, opcionId: string) {
    return cliente
      .post<VeredictoRunner>(`${RUNNER}/${moduloId}/verificar`, { preguntaId, opcionId })
      .then((r) => r.data);
  },
  terminarRunner(moduloId: string, respuestas: { preguntaId: string; opcionId: string }[]) {
    return cliente
      .post<ResultadoRunner>(`${RUNNER}/${moduloId}/terminar`, { respuestas })
      .then((r) => r.data);
  },

  configurar(moduloId: string, datos: DatosConfiguracionJuego) {
    return cliente
      .put<ConfiguracionJuego>(`/juegos/modulos/${moduloId}/configuracion`, datos)
      .then((r) => r.data);
  },
};
