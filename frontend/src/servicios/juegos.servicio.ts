import { cliente } from './cliente';
import type { ConfiguracionJuego, Juego, Velocidad } from '@/tipos';

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
}

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
  configurar(moduloId: string, datos: DatosConfiguracionJuego) {
    return cliente
      .put<ConfiguracionJuego>(`/juegos/modulos/${moduloId}/configuracion`, datos)
      .then((r) => r.data);
  },
};
