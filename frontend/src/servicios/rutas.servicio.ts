import { cliente } from './cliente';
import type { Ruta } from '@/tipos';

export interface DatosRuta {
  nombre: string;
  descripcion?: string;
  institucionId?: string;
}

export const rutasServicio = {
  listar() {
    return cliente.get<Ruta[]>('/rutas').then((r) => r.data);
  },
  obtener(id: string) {
    return cliente.get<Ruta>(`/rutas/${id}`).then((r) => r.data);
  },
  crear(datos: DatosRuta) {
    return cliente.post<Ruta>('/rutas', datos).then((r) => r.data);
  },
  actualizar(id: string, datos: Partial<DatosRuta>) {
    return cliente.patch<Ruta>(`/rutas/${id}`, datos).then((r) => r.data);
  },
  eliminar(id: string) {
    return cliente.delete(`/rutas/${id}`);
  },
  agregarCurso(rutaId: string, cursoId: string) {
    return cliente.post(`/rutas/${rutaId}/cursos`, { cursoId });
  },
  quitarCurso(rutaId: string, cursoId: string) {
    return cliente.delete(`/rutas/${rutaId}/cursos/${cursoId}`);
  },
};
