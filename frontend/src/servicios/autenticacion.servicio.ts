import { cliente } from './cliente';
import type { UsuarioAutenticado } from '@/tipos';

export interface RespuestaIngreso {
  tokenAcceso: string;
  usuario: UsuarioAutenticado;
}

/** Ids publicos de Google; null si el servidor no los tiene configurados. */
export interface OpcionesPublicas {
  googleClientId: string | null;
  googleAnalyticsId: string | null;
}

export interface DatosRegistro {
  nombre: string;
  correo: string;
  clave: string;
  /** Codigo de registro de la institucion (ABCD-EFGH). */
  codigo: string;
}

export const autenticacionServicio = {
  /** Publico: un estudiante nuevo crea su cuenta y queda con la sesion iniciada. */
  registrar(datos: DatosRegistro) {
    return cliente
      .post<RespuestaIngreso & { institucion: string }>('/autenticacion/registro', datos)
      .then((r) => r.data);
  },
  opciones() {
    return cliente.get<OpcionesPublicas>('/autenticacion/opciones').then((r) => r.data);
  },
  ingresarConGoogle(credencial: string) {
    return cliente
      .post<RespuestaIngreso>('/autenticacion/google', { credencial })
      .then((r) => r.data);
  },
  ingresar(correo: string, clave: string) {
    return cliente
      .post<RespuestaIngreso>('/autenticacion/ingresar', { correo, clave })
      .then((r) => r.data);
  },
  perfil() {
    return cliente.get<UsuarioAutenticado>('/autenticacion/perfil').then((r) => r.data);
  },
  actualizarPerfil(datos: { nombre?: string; correo?: string }) {
    return cliente
      .patch<RespuestaIngreso>('/autenticacion/perfil', datos)
      .then((r) => r.data);
  },
  cambiarClave(claveActual: string, claveNueva: string) {
    return cliente.patch('/autenticacion/clave', { claveActual, claveNueva });
  },
};
