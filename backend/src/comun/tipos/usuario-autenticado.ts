import { Rol } from '../enums/rol.enum';

export interface UsuarioAutenticado {
  id: string;
  correo: string;
  nombre: string;
  rol: Rol;
  institucionId: string | null;
}
