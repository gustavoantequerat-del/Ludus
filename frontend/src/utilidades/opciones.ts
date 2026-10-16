import { autenticacionServicio, type OpcionesPublicas } from '@/servicios/autenticacion.servicio';

let pedido: Promise<OpcionesPublicas> | null = null;

/**
 * Opciones publicas del servidor (ids de Google). Se piden una sola vez; si
 * el servidor no responde, la app sigue sin Google ni Analytics.
 */
export function opcionesPublicas(): Promise<OpcionesPublicas> {
  pedido ??= autenticacionServicio
    .opciones()
    .catch(() => ({ googleClientId: null, googleAnalyticsId: null }));
  return pedido;
}
