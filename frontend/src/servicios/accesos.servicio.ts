import { cliente } from './cliente';
import type { ListadoAccesos } from '@/tipos';

export const accesosServicio = {
  listar(dias: number) {
    return cliente.get<ListadoAccesos>('/accesos', { params: { dias } }).then((r) => r.data);
  },
};
