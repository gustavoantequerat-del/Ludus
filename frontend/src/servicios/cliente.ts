import axios from 'axios';
import { useAlmacenAutenticacion } from '@/almacenes/autenticacion';

export const cliente = axios.create({
  baseURL: import.meta.env.VITE_URL_API || '/api',
});

cliente.interceptors.request.use((config) => {
  const almacen = useAlmacenAutenticacion();
  if (almacen.token) {
    config.headers.Authorization = `Bearer ${almacen.token}`;
  }
  return config;
});

/**
 * Un 401 aqui significa token vencido o invalido, salvo en el cambio de clave:
 * ahi el 401 es "la contrasena actual no es correcta" y la sesion sigue viva.
 */
const RUTAS_SIN_CIERRE_DE_SESION = ['/autenticacion/clave'];

cliente.interceptors.response.use(
  (respuesta) => respuesta,
  (error) => {
    const url = error.config?.url ?? '';
    const esRutaExcluida = RUTAS_SIN_CIERRE_DE_SESION.some((ruta) => url.includes(ruta));
    if (error.response?.status === 401 && !esRutaExcluida) {
      const almacen = useAlmacenAutenticacion();
      almacen.cerrarSesion();
    }
    return Promise.reject(error);
  },
);
