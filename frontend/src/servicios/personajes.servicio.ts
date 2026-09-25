import { cliente } from './cliente';
import type { Personaje } from '@/tipos';

export interface DatosPersonaje {
  nombre: string;
  cargo?: string;
  /** Imagen nueva como data URL; se usa al subir un archivo. */
  imagenSubida?: string;
  /** Imagen que ya estaba en la carpeta del servidor. */
  imagenExistente?: string;
}

export const personajesServicio = {
  listar() {
    return cliente.get<Personaje[]>('/personajes').then((r) => r.data);
  },
  /** Imagenes sueltas en el servidor que todavia no son un personaje. */
  disponibles() {
    return cliente.get<string[]>('/personajes/disponibles').then((r) => r.data);
  },
  crear(datos: DatosPersonaje) {
    return cliente.post<Personaje>('/personajes', datos).then((r) => r.data);
  },
  actualizar(id: string, datos: Partial<DatosPersonaje>) {
    return cliente.patch<Personaje>(`/personajes/${id}`, datos).then((r) => r.data);
  },
  eliminar(id: string) {
    return cliente.delete(`/personajes/${id}`).then(() => undefined);
  },
};
