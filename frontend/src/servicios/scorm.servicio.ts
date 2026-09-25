import { cliente } from './cliente';
import type { PaqueteScorm } from '@/tipos';

export interface DiagnosticoScorm {
  /** Direccion que se escribe dentro de cada paquete exportado. */
  urlApi: string;
  /** Por que esa direccion no va a funcionar en un LMS real, si aplica. */
  advertencia: string | null;
}

export const scormServicio = {
  listar() {
    return cliente.get<PaqueteScorm[]>('/scorm/paquetes').then((r) => r.data);
  },
  diagnostico() {
    return cliente.get<DiagnosticoScorm>('/scorm/diagnostico').then((r) => r.data);
  },
  crear(moduloId: string) {
    return cliente.post<PaqueteScorm>('/scorm/paquetes', { moduloId }).then((r) => r.data);
  },
  cambiarEstado(id: string, activo: boolean) {
    return cliente.patch<PaqueteScorm>(`/scorm/paquetes/${id}`, { activo }).then((r) => r.data);
  },
  eliminar(id: string) {
    return cliente.delete(`/scorm/paquetes/${id}`);
  },
  /** Descarga el ZIP y dispara el guardado en el navegador. */
  async descargar(id: string, nombreDeRespaldo: string) {
    const respuesta = await cliente.get(`/scorm/paquetes/${id}/descargar`, {
      responseType: 'blob',
    });
    // El nombre lo decide el backend; el de respaldo solo cubre el caso en que
    // un proxy se coma la cabecera.
    const cabecera = String(respuesta.headers['content-disposition'] ?? '');
    const coincidencia = cabecera.match(/filename="([^"]+)"/);

    const url = URL.createObjectURL(respuesta.data as Blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = coincidencia ? coincidencia[1] : nombreDeRespaldo;
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
    URL.revokeObjectURL(url);
  },
};
