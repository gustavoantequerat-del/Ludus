import axios from 'axios';

/**
 * Texto que el backend manda cuando rechaza una peticion. class-validator
 * devuelve una lista de mensajes; el resto de los errores, uno solo.
 */
export function mensajeDeError(error: unknown, respaldo = 'No se pudo guardar'): string {
  if (axios.isAxiosError(error)) {
    const cuerpo = error.response?.data as { message?: string | string[] } | undefined;
    const mensaje = cuerpo?.message;
    if (Array.isArray(mensaje)) return mensaje[0];
    if (mensaje) return mensaje;
  }
  return respaldo;
}
