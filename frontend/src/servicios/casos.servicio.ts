import { cliente } from './cliente';
import type { CampoExpediente, CasoEditable, DecisionCumplimiento } from '@/tipos';

export interface DatosCaso {
  entidad: string;
  tipo?: string;
  jurisdiccion?: string;
  solicitud?: string;
  registroLicencia?: string;
  travelRule?: string;
  beneficiarioFinal?: string;
  controlesAml?: string;
  sanciones?: string;
  exposicionOnchain?: string;
  camposExtra?: CampoExpediente[];
  decisionCorrecta: DecisionCumplimiento;
  regla?: string;
  explicacion?: string;
  origen?: string;
  personajeId?: string | null;
  activo?: boolean;
}

export const casosServicio = {
  listar() {
    return cliente.get<CasoEditable[]>('/juegos/mesa-cumplimiento/casos').then((r) => r.data);
  },
  crear(datos: DatosCaso) {
    return cliente.post<CasoEditable>('/juegos/mesa-cumplimiento/casos', datos).then((r) => r.data);
  },
  actualizar(id: string, datos: Partial<DatosCaso>) {
    return cliente.patch<CasoEditable>(`/juegos/mesa-cumplimiento/casos/${id}`, datos).then((r) => r.data);
  },
  eliminar(id: string) {
    return cliente.delete(`/juegos/mesa-cumplimiento/casos/${id}`).then(() => undefined);
  },
  /** Copia el catalogo base de Ludus a la institucion para poder editarlo. */
  duplicarBase() {
    return cliente
      .post<CasoEditable[]>('/juegos/mesa-cumplimiento/casos/duplicar-base')
      .then((r) => r.data);
  },
};
