import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BancosAjedrezService } from './bancos-ajedrez.service';
import { BancoAjedrez, PreguntaAjedrez } from './banco-ajedrez.entidad';
import { Desenlace, ModoPregunta, PartidaAjedrez } from './partida-ajedrez.entidad';
import { AccesoModuloService } from '../acceso-modulo.service';
import { ResultadosService } from '../../resultados/resultados.service';
import { CLAVE_AJEDREZ } from '../catalogo-nuevos';
import { Rol } from '../../comun/enums/rol.enum';
import { UsuarioAutenticado } from '../../comun/tipos/usuario-autenticado';
import { ResponderPreguntaDto } from './dto/partida-ajedrez.dto';
import { alAzar, mezclar } from '../../comun/utilidades/azar';
import { IntentosService } from '../../resultados/intentos.service';

/** Margen sobre el tiempo de la partida para la latencia y el reloj del navegador. */
const GRACIA_TIEMPO_MS = 15_000;
/** Tiempo extra para responder la pregunta que quedo abierta cuando termino el reloj. */
const MARGEN_PREGUNTA_ABIERTA_MS = 120_000;

/**
 * Partida del Ajedrez de Preguntas.
 *
 * El tablero y el bot corren en el navegador. Lo que define la nota se decide
 * aqui: el servidor elige cada pregunta, la corrige, lleva el tiempo y, al
 * terminar, calcula la nota con lo que quedo registrado. Ganarle al bot solo
 * termina la partida; la nota es la parte de las preguntas respondidas bien.
 */
@Injectable()
export class AjedrezService {
  constructor(
    @InjectRepository(PartidaAjedrez)
    private readonly partidasRepo: Repository<PartidaAjedrez>,
    private readonly bancos: BancosAjedrezService,
    private readonly acceso: AccesoModuloService,
    private readonly resultadosService: ResultadosService,
    private readonly intentos: IntentosService,
  ) {}

  /** Al configurar un modulo: el banco existe, es visible y tiene las preguntas minimas. */
  async validarAjustes(
    quien: UsuarioAutenticado,
    ajustes: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    if (typeof ajustes.bancoId !== 'string') {
      throw new BadRequestException('Elige el banco de preguntas que va a usar el modulo');
    }
    const banco = await this.bancos.visible(quien, ajustes.bancoId);
    const problema = this.bancos.problemaParaJugar(banco);
    if (problema) throw new BadRequestException(problema);
    return { bancoId: banco.id };
  }

  /** Empieza una partida nueva: cada visita a la pantalla de juego es un intento. */
  async iniciar(quien: UsuarioAutenticado, moduloId: string) {
    this.soloEstudiante(quien);
    const { configuracion, banco } = await this.bancoDelModulo(quien, moduloId);
    await this.intentos.exigirDisponible(quien, moduloId, configuracion.intentosPermitidos);
    const partida = await this.partidasRepo.save(
      this.partidasRepo.create({
        moduloId,
        estudianteId: quien.id,
        bancoId: banco.id,
        preguntas: [],
        minutos: banco.minutos,
        minimoPreguntas: banco.minimoPreguntas,
      }),
    );
    return {
      partidaId: partida.id,
      juego: { clave: CLAVE_AJEDREZ, nombre: configuracion.juego.nombre },
      titulo: configuracion.titulo,
      instrucciones: configuracion.instrucciones,
      minutos: partida.minutos,
      minimoPreguntas: partida.minimoPreguntas,
      totalPreguntas: banco.preguntas.length,
    };
  }

  /**
   * La pregunta de una captura (o del modo examen). Si quedo una sin
   * responder, devuelve esa misma: recargar no sirve para cambiarla.
   */
  async pedirPregunta(
    quien: UsuarioAutenticado,
    moduloId: string,
    partidaId: string,
    modoPedido: Exclude<ModoPregunta, 'examen'>,
  ) {
    const partida = await this.partidaPropia(quien, moduloId, partidaId);
    if (partida.estado === 'terminada') throw new BadRequestException('La partida ya termino');

    const banco = await this.bancoDePartida(partida);
    const pendiente = partida.preguntas.find((p) => p.opcionId === null);
    if (pendiente) {
      const pregunta = banco.preguntas.find((p) => p.id === pendiente.preguntaId);
      if (pregunta) return this.paraEstudiante(pregunta, pendiente.modo);
      partida.preguntas = partida.preguntas.filter((p) => p !== pendiente);
    }

    let modo: ModoPregunta = modoPedido;
    if (partida.estado === 'examen') {
      modo = 'examen';
      if (this.respondidas(partida) >= partida.minimoPreguntas) {
        throw new BadRequestException('Ya respondiste las preguntas del examen; termina la partida');
      }
    } else {
      if (partida.criticaFallada) {
        throw new BadRequestException('Fallaste la pregunta critica: la partida termino');
      }
      if (this.tiempoVencido(partida)) {
        throw new ConflictException('Se acabo el tiempo de la partida');
      }
    }

    const pregunta = this.elegir(banco, partida, modo);
    partida.preguntas.push({ preguntaId: pregunta.id, modo, opcionId: null, correcta: null });
    await this.partidasRepo.save(partida);
    return this.paraEstudiante(pregunta, modo);
  }

  /** Corrige la pregunta pendiente. No dice cual era la correcta: las preguntas se repiten. */
  async responder(
    quien: UsuarioAutenticado,
    moduloId: string,
    partidaId: string,
    respuesta: ResponderPreguntaDto,
  ) {
    const partida = await this.partidaPropia(quien, moduloId, partidaId);
    const pendiente = partida.preguntas.find(
      (p) => p.opcionId === null && p.preguntaId === respuesta.preguntaId,
    );
    if (!pendiente) throw new BadRequestException('Esa pregunta no esta esperando respuesta');
    // Si el reloj termina con una pregunta abierta, se deja terminar de responderla,
    // pero no indefinidamente: hay un margen extra. El modo examen no tiene reloj.
    if (partida.estado === 'jugando' && this.tiempoVencido(partida, MARGEN_PREGUNTA_ABIERTA_MS)) {
      throw new ConflictException('Se acabo el tiempo de la partida');
    }

    const banco = await this.bancoDePartida(partida);
    const pregunta = banco.preguntas.find((p) => p.id === respuesta.preguntaId);
    if (pregunta && !pregunta.opciones.some((o) => o.id === respuesta.opcionId)) {
      throw new BadRequestException('Esa opcion no es de la pregunta');
    }
    // Si el docente borro la pregunta a mitad de partida, cuenta como no acertada.
    const correcta = !!pregunta && pregunta.correctaId === respuesta.opcionId;
    pendiente.opcionId = respuesta.opcionId;
    pendiente.correcta = correcta;
    if (pendiente.modo === 'critica' && !correcta) partida.criticaFallada = true;
    await this.partidasRepo.save(partida);

    return {
      correcta,
      modo: pendiente.modo,
      respondidas: this.respondidas(partida),
      correctas: partida.preguntas.filter((p) => p.correcta).length,
      faltanExamen:
        partida.estado === 'examen' ? Math.max(0, partida.minimoPreguntas - this.respondidas(partida)) : 0,
    };
  }

  /**
   * Termina la partida. Si salieron menos de X preguntas, pasa a modo examen y
   * dice cuantas faltan; cuando se completan, se vuelve a llamar y califica.
   */
  async terminar(quien: UsuarioAutenticado, moduloId: string, partidaId: string, desenlace: Desenlace) {
    const partida = await this.partidaPropia(quien, moduloId, partidaId);
    if (partida.estado === 'terminada') return this.resumen(partida);

    // Lo que quedo sin responder (por ejemplo, el tiempo corto la pregunta) no cuenta.
    partida.preguntas = partida.preguntas.filter((p) => p.opcionId !== null);
    partida.desenlace ??= partida.criticaFallada ? 'derrota' : desenlace;

    const respondidas = this.respondidas(partida);
    if (respondidas < partida.minimoPreguntas) {
      partida.estado = 'examen';
      await this.partidasRepo.save(partida);
      return {
        examen: true,
        desenlace: partida.desenlace,
        respondidas,
        faltan: partida.minimoPreguntas - respondidas,
      };
    }

    const correctas = partida.preguntas.filter((p) => p.correcta).length;
    const resultado = await this.resultadosService.crear(quien, {
      moduloId,
      puntaje: Math.round((correctas / respondidas) * 100),
    });
    partida.estado = 'terminada';
    partida.terminadaEn = new Date();
    partida.puntaje = resultado.puntaje;
    partida.nota = resultado.nota;
    partida.intento = resultado.intento;
    await this.partidasRepo.save(partida);
    return this.resumen(partida);
  }

  /* ---------------------------------------------------------------- */

  private resumen(partida: PartidaAjedrez) {
    return {
      examen: false,
      desenlace: partida.desenlace,
      respondidas: this.respondidas(partida),
      correctas: partida.preguntas.filter((p) => p.correcta).length,
      enExamen: partida.preguntas.filter((p) => p.modo === 'examen').length,
      puntaje: partida.puntaje,
      nota: partida.nota,
      intento: partida.intento,
    };
  }

  private respondidas(partida: PartidaAjedrez): number {
    return partida.preguntas.filter((p) => p.opcionId !== null).length;
  }

  private tiempoVencido(partida: PartidaAjedrez, margenExtraMs = 0): boolean {
    if (!partida.minutos) return false;
    return Date.now() > partida.iniciadaEn.getTime() + partida.minutos * 60_000 + GRACIA_TIEMPO_MS + margenExtraMs;
  }

  /**
   * normal y examen: cualquiera del banco. rey y critica: una dificil si el
   * docente marco alguna. En todos los casos primero las que todavia no
   * salieron en esta partida; cuando se agotan, se repiten (nunca dos veces
   * seguidas la misma, si hay de donde elegir).
   */
  private elegir(banco: BancoAjedrez, partida: PartidaAjedrez, modo: ModoPregunta): PreguntaAjedrez {
    const dificiles = banco.preguntas.filter((p) => p.dificil);
    const grupo = (modo === 'rey' || modo === 'critica') && dificiles.length ? dificiles : banco.preguntas;
    const salidas = new Set(partida.preguntas.map((p) => p.preguntaId));
    const nuevas = grupo.filter((p) => !salidas.has(p.id));
    if (nuevas.length) return alAzar(nuevas);
    const ultima = partida.preguntas[partida.preguntas.length - 1]?.preguntaId;
    const otras = grupo.filter((p) => p.id !== ultima);
    return alAzar(otras.length ? otras : grupo);
  }

  /** Sin la correcta y con las opciones en otro orden cada vez. */
  private paraEstudiante(pregunta: PreguntaAjedrez, modo: ModoPregunta) {
    return {
      preguntaId: pregunta.id,
      texto: pregunta.texto,
      opciones: mezclar(pregunta.opciones),
      modo,
    };
  }

  private soloEstudiante(quien: UsuarioAutenticado) {
    if (quien.rol !== Rol.ESTUDIANTE) {
      throw new ForbiddenException('Solo un estudiante juega la partida');
    }
  }

  private async bancoDelModulo(quien: UsuarioAutenticado, moduloId: string) {
    const configuracion = await this.acceso.configuracionDe(quien, moduloId, CLAVE_AJEDREZ);
    const bancoId = configuracion.ajustes.bancoId;
    const banco =
      typeof bancoId === 'string' ? await this.bancos.visible(quien, bancoId).catch(() => null) : null;
    if (!banco) {
      throw new BadRequestException('El banco de preguntas de este modulo ya no existe. Avisale a tu docente.');
    }
    const problema = this.bancos.problemaParaJugar(banco);
    if (problema) throw new BadRequestException(problema);
    return { configuracion, banco };
  }

  private async bancoDePartida(partida: PartidaAjedrez): Promise<BancoAjedrez> {
    const banco = await this.bancos.porId(partida.bancoId);
    if (!banco) throw new BadRequestException('El banco de preguntas de esta partida ya no existe');
    return banco;
  }

  private async partidaPropia(
    quien: UsuarioAutenticado,
    moduloId: string,
    partidaId: string,
  ): Promise<PartidaAjedrez> {
    this.soloEstudiante(quien);
    const partida = await this.partidasRepo.findOne({ where: { id: partidaId } }).catch(() => null);
    if (!partida || partida.estudianteId !== quien.id || partida.moduloId !== moduloId) {
      throw new NotFoundException('La partida no existe');
    }
    return partida;
  }
}
