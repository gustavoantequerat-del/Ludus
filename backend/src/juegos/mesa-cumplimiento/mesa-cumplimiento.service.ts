import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { CampoExpediente, CasoCumplimiento, Decision } from './caso-cumplimiento.entidad';
import { CAMPOS_EXPEDIENTE, ETIQUETAS_DECISION, ETIQUETAS_EXPEDIENTE } from './casos';

/** Lo que ve el jugador: el expediente sin la respuesta. */
export interface CasoPublico {
  id: string;
  entidad: string;
  tipo: string;
  jurisdiccion: string;
  solicitud: string;
  campos: CampoExpediente[];
  personaje: { nombre: string; cargo: string; imagen: string } | null;
}

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
  constructor(
    @InjectRepository(CasoCumplimiento)
    private readonly casosRepo: Repository<CasoCumplimiento>,
  ) {}

  /**
   * Baraja el banco de la institucion y devuelve los expedientes sin la
   * respuesta correcta.
   *
   * Si la institucion todavia no escribio casos propios se juega con el
   * catalogo base de Ludus; en cuanto tiene uno, la mesa usa solo los suyos.
   */
  async armarPartida(cantidad: number, institucionId: string | null): Promise<CasoPublico[]> {
    const casos = await this.bancoDe(institucionId);
    if (casos.length === 0) {
      throw new BadRequestException('No hay casos cargados para este juego');
    }

    const barajado = [...casos].sort(() => Math.random() - 0.5);
    const total = Math.min(Math.max(cantidad, 1), casos.length);
    return barajado.slice(0, total).map((caso) => this.aPublico(caso));
  }

  /** Feedback inmediato de un caso, para mostrarlo apenas el jugador decide. */
  async verificar(casoId: string, decision: Decision): Promise<VeredictoCaso> {
    this.decisionValida(decision);
    const caso = await this.casosRepo.findOne({ where: { id: casoId } });
    if (!caso) throw new BadRequestException('El caso no existe');
    return this.veredicto(caso, decision);
  }

  /**
   * Calificacion autoritativa de la partida. Se recalcula en el servidor para
   * que la nota no dependa de lo que informe el cliente.
   */
  async calificar(respuestas: RespuestaJugador[]): Promise<Calificacion> {
    if (respuestas.length === 0) {
      throw new BadRequestException('La partida no tiene respuestas');
    }

    const casos = await this.casosRepo.find({
      where: { id: In(respuestas.map((respuesta) => respuesta.casoId)) },
    });
    const porId = new Map(casos.map((caso) => [caso.id, caso]));

    const detalle = respuestas.map((respuesta) => {
      this.decisionValida(respuesta.decision);
      const caso = porId.get(respuesta.casoId);
      if (!caso) throw new BadRequestException('El caso no existe');
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

  /** Casos propios de la institucion; si no tiene, el catalogo base. */
  private async bancoDe(institucionId: string | null): Promise<CasoCumplimiento[]> {
    if (institucionId) {
      const propios = await this.casosRepo.find({ where: { institucionId, activo: true } });
      if (propios.length > 0) return propios;
    }
    return this.casosRepo.find({ where: { institucionId: IsNull(), activo: true } });
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
      campos: this.expediente(caso),
      personaje: caso.personaje
        ? {
            nombre: caso.personaje.nombre,
            cargo: caso.personaje.cargo,
            imagen: caso.personaje.imagen,
          }
        : null,
    };
  }

  /**
   * Los seis campos fijos en su orden, sin los vacios, mas los extra del caso.
   * Un campo vacio no se muestra: el expediente no debe sugerir que falta algo
   * cuando el docente simplemente no lo uso.
   */
  private expediente(caso: CasoCumplimiento): CampoExpediente[] {
    const fijos = CAMPOS_EXPEDIENTE.filter((clave) => caso[clave]).map((clave) => ({
      etiqueta: ETIQUETAS_EXPEDIENTE[clave],
      valor: caso[clave],
    }));
    return [...fijos, ...(caso.camposExtra ?? [])];
  }

  get etiquetas() {
    return ETIQUETAS_DECISION;
  }
}
