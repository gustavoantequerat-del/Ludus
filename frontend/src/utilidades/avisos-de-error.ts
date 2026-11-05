/**
 * Red de seguridad para los errores que ninguna pantalla maneja.
 *
 * Si una accion falla (el servidor rechaza un correo repetido, un dato
 * invalido, un permiso) y la vista no lo atrapa, antes no pasaba nada en
 * pantalla. Ahora se muestra el mensaje del servidor y queda el detalle en la
 * consola del navegador. Un 401 no se avisa: es la sesion vencida y el
 * cliente ya manda al login.
 */
import type { App } from 'vue';
import axios from 'axios';
import { usarNotificaciones } from '@/composables/usarNotificaciones';
import { mensajeDeError } from '@/utilidades/errores';

const DURACION_ERROR_MS = 6000;

function avisar(error: unknown, origen: string) {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 401) return;
    const metodo = error.config?.method?.toUpperCase() ?? '';
    console.error(`[Ludus] ${origen}: ${metodo} ${error.config?.url ?? ''} -> ${error.response?.status ?? 'sin respuesta'}`, error.response?.data ?? error.message);
    const texto = error.response
      ? mensajeDeError(error, 'El servidor rechazo la operacion')
      : 'No hay conexion con el servidor. Revisa tu internet e intenta de nuevo.';
    usarNotificaciones().notificar(texto, DURACION_ERROR_MS);
    return;
  }
  console.error(`[Ludus] ${origen}:`, error);
  usarNotificaciones().notificar('Algo salio mal. Recarga la pagina e intenta de nuevo.', DURACION_ERROR_MS);
}

export function instalarAvisosDeError(app: App) {
  // Errores dentro de componentes y de sus manejadores (clics, onMounted...).
  app.config.errorHandler = (error) => avisar(error, 'error en pantalla');
  // Promesas que nadie espero (por ejemplo, una carga lanzada sin await).
  window.addEventListener('unhandledrejection', (evento) => avisar(evento.reason, 'promesa sin manejar'));
}
