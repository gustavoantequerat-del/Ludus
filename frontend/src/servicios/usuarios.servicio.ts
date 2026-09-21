import { cliente } from './cliente';
import type { Rol, Usuario } from '@/tipos';

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
};
