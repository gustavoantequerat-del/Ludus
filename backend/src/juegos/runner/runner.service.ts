import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { HistoriasService } from './historias.service';
import { Historia, PreguntaRunner } from './historia.entidad';
import { AccesoModuloService } from '../acceso-modulo.service';
import { ResultadosService } from '../../resultados/resultados.service';
import { CLAVE_RUNNER } from '../catalogo-nuevos';
import { UsuarioAutenticado } from '../../comun/tipos/usuario-autenticado';
import { RespuestaRunnerDto } from './dto/historia.dto';

function mezclar<T>(lista: T[]): T[] {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

/**
 * Partida del Runner Narrativo. La historia sale sin decir cual opcion es la
 * buena; cada respuesta se verifica aqui y recien ahi se entrega el video que
 * corresponde. La nota tambien se calcula aqui.
 */
@Injectable()
export class RunnerService {
  constructor(
    private readonly historias: HistoriasService,
    private readonly acceso: AccesoModuloService,
    private readonly resultadosService: ResultadosService,
  ) {}

  async validarAjustes(
    quien: UsuarioAutenticado,
    ajustes: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    if (typeof ajustes.historiaId !== 'string') {
      throw new BadRequestException('Elige la historia que va a jugar el modulo');
    }
    const historia = await this.historias.visible(quien, ajustes.historiaId);
    if (historia.preguntas.length === 0) {
      throw new BadRequestException(`La historia "${historia.nombre}" todavia no tiene preguntas`);
    }
    return { historiaId: historia.id };
  }

  async armarPartida(quien: UsuarioAutenticado, moduloId: string) {
    const { configuracion, historia } = await this.historiaDelModulo(quien, moduloId);
    return {
      juego: { clave: CLAVE_RUNNER, nombre: configuracion.juego.nombre },
      titulo: configuracion.titulo,
      instrucciones: configuracion.instrucciones,
      historia: {
        nombre: historia.nombre,
        videoIntro: historia.videoIntro,
        preguntas: historia.preguntas.map((pregunta) => ({
          id: pregunta.id,
          texto: pregunta.texto,
          opciones: mezclar([
            { id: pregunta.opcionCorrectaId, texto: pregunta.respuestaCorrecta },
            { id: pregunta.opcionIncorrectaId, texto: pregunta.respuestaIncorrecta },
          ]),
        })),
      },
    };
  }

  /** Si la opcion es la buena, y el video que se ve a continuacion. */
  async verificar(quien: UsuarioAutenticado, moduloId: string, respuesta: RespuestaRunnerDto) {
    const { historia } = await this.historiaDelModulo(quien, moduloId);
    const pregunta = this.pregunta(historia, respuesta.preguntaId);
    const correcta = this.esCorrecta(pregunta, respuesta.opcionId);
    return { correcta, video: correcta ? pregunta.videoBueno : pregunta.videoMalo };
  }

  /**
   * Cuenta las respuestas buenas en orden hasta el primer error, que es donde
   * termina la historia. El puntaje es la parte de la historia que se recorrio.
   */
  async terminar(quien: UsuarioAutenticado, moduloId: string, respuestas: RespuestaRunnerDto[]) {
    const { historia } = await this.historiaDelModulo(quien, moduloId);
    const total = historia.preguntas.length;

    let correctas = 0;
    for (const [indice, pregunta] of historia.preguntas.entries()) {
      const respuesta = respuestas[indice];
      if (!respuesta || respuesta.preguntaId !== pregunta.id) break;
      if (!this.esCorrecta(pregunta, respuesta.opcionId)) break;
      correctas += 1;
    }

    const puntaje = Math.round((correctas / total) * 100);
    const resultado = await this.resultadosService.crear(quien, { moduloId, puntaje });
    return {
      correctas,
      total,
      completada: correctas === total,
      puntaje: resultado.puntaje,
      nota: resultado.nota,
      intento: resultado.intento,
    };
  }

  /* ---------------------------------------------------------------- */

  private async historiaDelModulo(quien: UsuarioAutenticado, moduloId: string) {
    const configuracion = await this.acceso.configuracionDe(quien, moduloId, CLAVE_RUNNER);
    const historiaId = configuracion.ajustes.historiaId;
    const historia =
      typeof historiaId === 'string'
        ? await this.historias.visible(quien, historiaId).catch(() => null)
        : null;
    if (!historia) {
      throw new BadRequestException('La historia de este modulo ya no existe. Avisale a tu docente.');
    }
    if (historia.preguntas.length === 0) {
      throw new BadRequestException('La historia de este modulo todavia no tiene preguntas');
    }
    return { configuracion, historia };
  }

  private pregunta(historia: Historia, preguntaId: string): PreguntaRunner {
    const pregunta = historia.preguntas.find((p) => p.id === preguntaId);
    if (!pregunta) throw new NotFoundException('La pregunta no es de esta historia');
    return pregunta;
  }

  private esCorrecta(pregunta: PreguntaRunner, opcionId: string): boolean {
    if (opcionId !== pregunta.opcionCorrectaId && opcionId !== pregunta.opcionIncorrectaId) {
      throw new BadRequestException('Esa opcion no es de la pregunta');
    }
    return opcionId === pregunta.opcionCorrectaId;
  }
}
