import { cliente } from './cliente';
import type { ClaveJuegoFichas, Mazo } from '@/tipos';

export interface DatosMazo {
  nombre: string;
  iconos: string[];
  imagenFicha: string | null;
  fondo: string | null;
}

export const mazosServicio = {
  listar(juego: ClaveJuegoFichas) {
    return cliente.get<Mazo[]>('/juegos/mazos', { params: { juego } }).then((r) => r.data);
  },
  crear(juegoClave: ClaveJuegoFichas, datos: DatosMazo) {
    return cliente.post<Mazo>('/juegos/mazos', { juegoClave, ...datos }).then((r) => r.data);
  },
  actualizar(id: string, datos: Partial<DatosMazo>) {
    return cliente.patch<Mazo>(`/juegos/mazos/${id}`, datos).then((r) => r.data);
  },
  duplicar(id: string) {
    return cliente.post<Mazo>(`/juegos/mazos/${id}/duplicar`).then((r) => r.data);
  },
  eliminar(id: string) {
    return cliente.delete(`/juegos/mazos/${id}`).then(() => undefined);
  },
  /** Sube una imagen (data URL) y devuelve su ruta en el servidor. */
  subirImagen(imagen: string, uso: 'icono' | 'ficha' | 'fondo') {
    return cliente
      .post<{ ruta: string }>('/juegos/mazos/imagenes', { imagen, uso })
      .then((r) => r.data.ruta);
  },
};
