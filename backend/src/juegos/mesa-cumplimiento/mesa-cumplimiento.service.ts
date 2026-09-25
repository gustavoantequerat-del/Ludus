import { BadRequestException, Injectable } from '@nestjs/common';
import {
  CASOS,
  CasoCumplimiento,
  Decision,
  ETIQUETAS_DECISION,
  casoPorId,
} from './casos';

/** Lo que ve el jugador: el expediente sin la respuesta. */
export type CasoPublico = Omit<
  CasoCumplimiento,
  'decisionCorrecta' | 'regla' | 'explicacion' | 'origen'
>;

export interface RespuestaJugador {
  casoId: string;
  decision: Decision;
}

export interface VeredictoCaso {
  casoId: string;
  entidad: string;
  decisionTomada: Decision;
  decisionCorrecta: Decision;
  correcta: boolean;
  regla: string;
  explicacion: string;
  origen: string;
}

export interface Calificacion {
  puntaje: number;
  aciertos: number;
  total: number;
  erroresPorExceso: number;
  erroresPorOmision: number;
  detalle: VeredictoCaso[];
}

const DECISIONES: Decision[] = ['aprobar', 'reforzar', 'rechazar'];

@Injectable()
export class MesaCumplimientoService {
  /** Baraja el banco y devuelve los expedientes sin la respuesta correcta. */
  armarPartida(cantidad: number): CasoPublico[] {
    const barajado = [...CASOS].sort(() => Math.random() - 0.5);
    const total = Math.min(Math.max(cantidad, 1), CASOS.length);
    return barajado.slice(0, total).map((caso) => this.aPublico(caso));
  }

  /** Feedback inmediato de un caso, para mostrarlo apenas el jugador decide. */
  verificar(casoId: string, decision: Decision): VeredictoCaso {
    const caso = this.casoValido(casoId);
    this.decisionValida(decision);
    return this.veredicto(caso, decision);
  }

  /**
   * Calificacion autoritativa de la partida. Se recalcula en el servidor para
   * que la nota no dependa de lo que informe el cliente.
   */
  calificar(respuestas: RespuestaJugador[]): Calificacion {
    if (respuestas.length === 0) {
      throw new BadRequestException('La partida no tiene respuestas');
    }

    const detalle = respuestas.map((respuesta) => {
      const caso = this.casoValido(respuesta.casoId);
      this.decisionValida(respuesta.decision);
      return this.veredicto(caso, respuesta.decision);
    });

    const aciertos = detalle.filter((v) => v.correcta).length;

    // Distinguir el tipo de error es parte de la ensenanza del curso: aprobar
    // de mas y rechazar por reflejo son fallas distintas.
    const erroresPorExceso = detalle.filter(
      (v) => !v.correcta && v.decisionTomada === 'rechazar',
    ).length;
    const erroresPorOmision = detalle.filter(
      (v) => !v.correcta && v.decisionCorrecta === 'rechazar',
    ).length;

    return {
      puntaje: Math.round((aciertos / detalle.length) * 100),
      aciertos,
      total: detalle.length,
      erroresPorExceso,
      erroresPorOmision,
      detalle,
    };
  }

  private veredicto(caso: CasoCumplimiento, decision: Decision): VeredictoCaso {
    return {
      casoId: caso.id,
      entidad: caso.entidad,
      decisionTomada: decision,
      decisionCorrecta: caso.decisionCorrecta,
      correcta: decision === caso.decisionCorrecta,
      regla: caso.regla,
      explicacion: caso.explicacion,
      origen: caso.origen,
    };
  }

  private casoValido(casoId: string): CasoCumplimiento {
    const caso = casoPorId(casoId);
    if (!caso) throw new BadRequestException('El caso no existe');
    return caso;
  }

  private decisionValida(decision: Decision): void {
    if (!DECISIONES.includes(decision)) {
      throw new BadRequestException('Decision invalida');
    }
  }

  private aPublico(caso: CasoCumplimiento): CasoPublico {
    return {
      id: caso.id,
      entidad: caso.entidad,
      tipo: caso.tipo,
      jurisdiccion: caso.jurisdiccion,
      solicitud: caso.solicitud,
      campos: caso.campos,
    };
  }

  get etiquetas() {
    return ETIQUETAS_DECISION;
  }
}
