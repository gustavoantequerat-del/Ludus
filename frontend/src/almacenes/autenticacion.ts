import { defineStore } from 'pinia';
import type { UsuarioAutenticado } from '@/tipos';
import { autenticacionServicio } from '@/servicios/autenticacion.servicio';

const LLAVE_TOKEN = 'ludus-token';
const LLAVE_USUARIO = 'ludus-usuario';

interface EstadoAutenticacion {
  token: string | null;
  usuario: UsuarioAutenticado | null;
}

function leerAlmacenado<T>(llave: string): T | null {
  try {
    const crudo = localStorage.getItem(llave);
    return crudo ? (JSON.parse(crudo) as T) : null;
  } catch {
    return null;
  }
}

export const useAlmacenAutenticacion = defineStore('autenticacion', {
  state: (): EstadoAutenticacion => ({
    token: localStorage.getItem(LLAVE_TOKEN),
    usuario: leerAlmacenado<UsuarioAutenticado>(LLAVE_USUARIO),
  }),
  getters: {
    estaAutenticado: (estado) => !!estado.token,
    rol: (estado) => estado.usuario?.rol ?? null,
  },
  actions: {
    async ingresar(correo: string, clave: string) {
      const respuesta = await autenticacionServicio.ingresar(correo, clave);
      this.guardarSesion(respuesta.tokenAcceso, respuesta.usuario);
    },
    /** El backend reemite el token porque lleva el nombre y el correo. */
    async actualizarPerfil(datos: { nombre?: string; correo?: string }) {
      const respuesta = await autenticacionServicio.actualizarPerfil(datos);
      this.guardarSesion(respuesta.tokenAcceso, respuesta.usuario);
    },
    guardarSesion(token: string, usuario: UsuarioAutenticado) {
      this.token = token;
      this.usuario = usuario;
      localStorage.setItem(LLAVE_TOKEN, token);
      localStorage.setItem(LLAVE_USUARIO, JSON.stringify(usuario));
    },
    cerrarSesion() {
      this.token = null;
      this.usuario = null;
      localStorage.removeItem(LLAVE_TOKEN);
      localStorage.removeItem(LLAVE_USUARIO);
    },
  },
});
