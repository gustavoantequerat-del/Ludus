import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { HistoriasService } from './historias.service';
import { Historia, PreguntaRunner } from './historia.entidad';
import { AccesoModuloService } from '../acceso-modulo.service';
import { ResultadosService } from '../../resultados/resultados.service';
import { CLAVE_RUNNER } from '../catalogo-nuevos';
import { UsuarioAutenticado } from '../../comun/tipos/usuario-autenticado';
import { RespuestaRunnerDto } from './dto/historia.dto';
import { leerLinkVideo } from './videos-externos';
import { mezclar } from '../../comun/utilidades/azar';
import { PartidasJuegoService } from '../partidas-juego.service';
import { IntentosService } from '../../resultados/intentos.service';

/**
 * Partida del Runner Narrativo. La historia sale sin decir cual opcion es la
 * buena; cada respuesta se verifica aqui y recien ahi se entrega el video que
 * corresponde, como { fuente: youtube | drive, id }. La nota tambien se calcula aqui.
 */
@Injectable()
export class RunnerService {
  constructor(
    private readonly historias: HistoriasService,
    private readonly acceso: AccesoModuloService,
    private readonly resultadosService: ResultadosService,
    private readonly partidas: PartidasJuegoService,
    private readonly intentos: IntentosService,
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
    await this.intentos.exigirDisponible(quien, moduloId, configuracion.intentosPermitidos);
    const partida = await this.partidas.crear(quien, moduloId, CLAVE_RUNNER, historia.preguntas.map((p) => p.id));
    return {
      partidaId: partida.id,
      juego: { clave: CLAVE_RUNNER, nombre: configuracion.juego.nombre },
      titulo: configuracion.titulo,
      instrucciones: configuracion.instrucciones,
      historia: {
        nombre: historia.nombre,
        videoIntro: leerLinkVideo(historia.videoIntro),
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

  /**
   * Si la opcion es la buena, y el video que se ve a continuacion. Las
   * preguntas se responden en orden y una sola vez: la historia termina en el
   * primer error, asi que despues de fallar ya no se puede seguir probando.
   */
  async verificar(quien: UsuarioAutenticado, moduloId: string, respuesta: RespuestaRunnerDto) {
    const { historia } = await this.historiaDelModulo(quien, moduloId);
    const partida = await this.partidas.abierta(quien, respuesta.partidaId, moduloId, CLAVE_RUNNER);
    const pregunta = this.pregunta(historia, respuesta.preguntaId);
    const indice = partida.preguntas.findIndex((p) => p.id === pregunta.id);
    const guardada = partida.preguntas[indice];
    if (!guardada) throw new BadRequestException('Esa pregunta no es de esta partida');

    if (guardada.respuesta === null) {
      if (partida.preguntas.some((p) => p.correcta === false)) {
        throw new BadRequestException('La historia ya termino: fallaste una pregunta anterior');
      }
      if (partida.preguntas.slice(0, indice).some((p) => p.respuesta === null)) {
        throw new BadRequestException('Responde las preguntas en orden');
      }
      await this.partidas.responder(partida, pregunta.id, respuesta.opcionId, this.esCorrecta(pregunta, respuesta.opcionId));
    }
    // Si ya la habia respondido (por ejemplo, un reintento por mala red), vale la primera.
    const correcta = guardada.correcta === true;
    return { correcta, video: leerLinkVideo(correcta ? pregunta.videoBueno : pregunta.videoMalo) };
  }

  /**
   * Cuenta las respuestas buenas en orden hasta el primer error, que es donde
   * termina la historia. El puntaje es la parte de la historia que se recorrio.
   * Sale de lo guardado en la partida, no de lo que mande el navegador.
   */
  async terminar(quien: UsuarioAutenticado, moduloId: string, partidaId: string | undefined) {
    await this.historiaDelModulo(quien, moduloId);
    const partida = await this.partidas.abierta(quien, partidaId, moduloId, CLAVE_RUNNER);
    const total = partida.preguntas.length;
    let correctas = 0;
    for (const pregunta of partida.preguntas) {
      if (pregunta.correcta !== true) break;
      correctas += 1;
    }

    await this.partidas.cerrar(partida);
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
