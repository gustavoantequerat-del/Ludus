import { cliente } from './cliente';
import type { Resultado } from '@/tipos';

export const resultadosServicio = {
  listar() {
    return cliente.get<Resultado[]>('/resultados').then((r) => r.data);
  },
  crear(moduloId: string, puntaje: number) {
    return cliente.post<Resultado>('/resultados', { moduloId, puntaje }).then((r) => r.data);
  },
};
