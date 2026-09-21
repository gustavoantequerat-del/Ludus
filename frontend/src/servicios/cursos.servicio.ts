import { cliente } from './cliente';
import type { Curso, ModuloCurso } from '@/tipos';

export interface DatosCurso {
  nombre: string;
  descripcion?: string;
  institucionId?: string;
  docenteId?: string;
}

export interface DatosModulo {
  titulo: string;
  descripcion?: string;
  califica?: boolean;
}

export const cursosServicio = {
  listar() {
    return cliente.get<Curso[]>('/cursos').then((r) => r.data);
  },
  explorar() {
    return cliente.get<Curso[]>('/cursos/explorar').then((r) => r.data);
  },
  obtener(id: string) {
    return cliente.get<Curso>(`/cursos/${id}`).then((r) => r.data);
  },
  crear(datos: DatosCurso) {
    return cliente.post<Curso>('/cursos', datos).then((r) => r.data);
  },
  actualizar(id: string, datos: Partial<DatosCurso>) {
    return cliente.patch<Curso>(`/cursos/${id}`, datos).then((r) => r.data);
  },
  eliminar(id: string) {
    return cliente.delete(`/cursos/${id}`);
  },
  crearModulo(cursoId: string, datos: DatosModulo) {
    return cliente.post<ModuloCurso>(`/cursos/${cursoId}/modulos`, datos).then((r) => r.data);
  },
  actualizarModulo(cursoId: string, moduloId: string, datos: Partial<DatosModulo>) {
    return cliente
      .patch<ModuloCurso>(`/cursos/${cursoId}/modulos/${moduloId}`, datos)
      .then((r) => r.data);
  },
  eliminarModulo(cursoId: string, moduloId: string) {
    return cliente.delete(`/cursos/${cursoId}/modulos/${moduloId}`);
  },
  moverModulo(cursoId: string, moduloId: string, direccion: 'arriba' | 'abajo') {
    return cliente.patch(`/cursos/${cursoId}/modulos/${moduloId}/mover`, { direccion });
  },
};
