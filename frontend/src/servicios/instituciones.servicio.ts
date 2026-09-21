import { cliente } from './cliente';
import type { Institucion } from '@/tipos';

export interface DatosInstitucion {
  nombre: string;
  dominio: string;
  activa?: boolean;
}

export const institucionesServicio = {
  listar() {
    return cliente.get<Institucion[]>('/instituciones').then((r) => r.data);
  },
  crear(datos: DatosInstitucion) {
    return cliente.post<Institucion>('/instituciones', datos).then((r) => r.data);
  },
  actualizar(id: string, datos: Partial<DatosInstitucion>) {
    return cliente.patch<Institucion>(`/instituciones/${id}`, datos).then((r) => r.data);
  },
  eliminar(id: string) {
    return cliente.delete(`/instituciones/${id}`);
  },
};
