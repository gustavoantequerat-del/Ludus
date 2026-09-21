import { cliente } from './cliente';
import type { EventoActividad, ResumenPanel } from '@/tipos';

export const panelServicio = {
  resumen() {
    return cliente.get<ResumenPanel>('/panel/resumen').then((r) => r.data);
  },
  actividad() {
    return cliente.get<EventoActividad[]>('/panel/actividad').then((r) => r.data);
  },
};
