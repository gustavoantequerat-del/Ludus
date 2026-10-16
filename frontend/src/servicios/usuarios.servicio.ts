import { cliente } from './cliente';
import type { ResultadoImportacion, Rol, Usuario } from '@/tipos';
import { guardarArchivo } from '@/utilidades/archivos';

const TIPO_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export interface DatosUsuario {
  nombre: string;
  correo: string;
  clave?: string;
  rol: Rol;
  institucionId?: string;
  activo?: boolean;
}

export const usuariosServicio = {
  listar(filtroRol?: Rol) {
    return cliente
      .get<Usuario[]>('/usuarios', { params: filtroRol ? { rol: filtroRol } : {} })
      .then((r) => r.data);
  },
  crear(datos: DatosUsuario) {
    return cliente.post<Usuario>('/usuarios', datos).then((r) => r.data);
  },
  actualizar(id: string, datos: Partial<DatosUsuario>) {
    return cliente.patch<Usuario>(`/usuarios/${id}`, datos).then((r) => r.data);
  },
  eliminar(id: string) {
    return cliente.delete(`/usuarios/${id}`);
  },
  async descargarPlantilla() {
    const respuesta = await cliente.get('/usuarios/plantilla', { responseType: 'blob' });
    guardarArchivo(respuesta.data as Blob, 'plantilla-usuarios.xlsx');
  },
  /** Sin `confirmar` el backend solo revisa el archivo y devuelve la vista previa. */
  importar(archivo: File, confirmar: boolean) {
    return cliente
      .post<ResultadoImportacion>('/usuarios/importar', archivo, {
        params: confirmar ? { confirmar: 'true' } : {},
        headers: { 'Content-Type': TIPO_XLSX },
      })
      .then((r) => r.data);
  },
};
