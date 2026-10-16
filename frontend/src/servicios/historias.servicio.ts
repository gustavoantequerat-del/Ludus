import { cliente } from './cliente';
import type { Historia, PreguntaHistoria } from '@/tipos';

const BASE = '/juegos/runner-narrativo';

export interface DatosHistoria {
  nombre: string;
  videoIntro: string | null;
  preguntas: PreguntaHistoria[];
}

export const historiasServicio = {
  listar() {
    return cliente.get<Historia[]>(`${BASE}/historias`).then((r) => r.data);
  },
  crear(datos: DatosHistoria) {
    return cliente.post<Historia>(`${BASE}/historias`, datos).then((r) => r.data);
  },
  actualizar(id: string, datos: DatosHistoria) {
    return cliente.put<Historia>(`${BASE}/historias/${id}`, datos).then((r) => r.data);
  },
  eliminar(id: string) {
    return cliente.delete(`${BASE}/historias/${id}`).then(() => undefined);
  },
};
