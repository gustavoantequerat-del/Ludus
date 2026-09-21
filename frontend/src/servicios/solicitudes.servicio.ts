import { cliente } from './cliente';
import type { EstadoSolicitud, Solicitud, TipoSolicitud } from '@/tipos';

export const solicitudesServicio = {
  listar() {
    return cliente.get<Solicitud[]>('/solicitudes').then((r) => r.data);
  },
  crear(tipo: TipoSolicitud, objetivo: { cursoId?: string; rutaId?: string }) {
    return cliente.post<Solicitud>('/solicitudes', { tipo, ...objetivo }).then((r) => r.data);
  },
  resolver(id: string, estado: Extract<EstadoSolicitud, 'aprobada' | 'rechazada'>) {
    return cliente.patch<Solicitud>(`/solicitudes/${id}`, { estado }).then((r) => r.data);
  },
};
