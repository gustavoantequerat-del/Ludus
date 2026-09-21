import { cliente } from './cliente';
import type { Inscripcion } from '@/tipos';

export const inscripcionesServicio = {
  deCurso(cursoId: string) {
    return cliente.get<Inscripcion[]>(`/cursos/${cursoId}/inscripciones`).then((r) => r.data);
  },
  asignarACurso(cursoId: string, estudianteIds: string[]) {
    return cliente
      .put<Inscripcion[]>(`/cursos/${cursoId}/inscripciones`, { estudianteIds })
      .then((r) => r.data);
  },
  deRuta(rutaId: string) {
    return cliente.get<Inscripcion[]>(`/rutas/${rutaId}/inscripciones`).then((r) => r.data);
  },
  asignarARuta(rutaId: string, estudianteIds: string[]) {
    return cliente
      .put<Inscripcion[]>(`/rutas/${rutaId}/inscripciones`, { estudianteIds })
      .then((r) => r.data);
  },
};
