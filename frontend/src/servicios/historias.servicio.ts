import { cliente } from './cliente';
import type { Historia, LimitesVideo, PreguntaHistoria } from '@/tipos';

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
  limites() {
    return cliente.get<LimitesVideo>(`${BASE}/videos/limites`).then((r) => r.data);
  },
  /**
   * El video viaja crudo, sin multipart: el cuerpo es el archivo. Devuelve la
   * ruta en el servidor e informa el avance para la barra de carga.
   */
  subirVideo(archivo: File, alAvanzar?: (porcentaje: number) => void) {
    return cliente
      .post<{ ruta: string }>(`${BASE}/videos`, archivo, {
        headers: { 'Content-Type': 'video/mp4' },
        onUploadProgress: (evento) => {
          if (alAvanzar && evento.total) alAvanzar(Math.round((evento.loaded / evento.total) * 100));
        },
      })
      .then((r) => r.data.ruta);
  },
};
