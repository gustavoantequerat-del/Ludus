import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Juego } from './juego.entidad';
import { ConfiguracionJuego } from './configuracion-juego.entidad';
import { ModuloCurso } from '../cursos/modulo-curso.entidad';
import { UsuarioAutenticado } from '../comun/tipos/usuario-autenticado';
import { ConfigurarJuegoDto } from './dto/configurar-juego.dto';
import { ResultadosService } from '../resultados/resultados.service';
import {
  MesaCumplimientoService,
  RespuestaJugador,
} from './mesa-cumplimiento/mesa-cumplimiento.service';
import { Decision } from './mesa-cumplimiento/casos';
import { FONDO_MESA } from '../archivos/archivos.constantes';
import { AccesoModuloService } from './acceso-modulo.service';
import { FichasService } from './fichas/fichas.service';
import { RunnerService } from './runner/runner.service';
import { CLAVE_MAHJONG, CLAVE_MEMORAMA, CLAVE_RUNNER } from './catalogo-nuevos';

export const CLAVE_MESA_CUMPLIMIENTO = 'mesa-cumplimiento';

@Injectable()
export class JuegosService {
  constructor(
    @InjectRepository(Juego)
    private readonly juegosRepo: Repository<Juego>,
    @InjectRepository(ConfiguracionJuego)
    private readonly configuracionesRepo: Repository<ConfiguracionJuego>,
    @InjectRepository(ModuloCurso)
    private readonly modulosRepo: Repository<ModuloCurso>,
    private readonly mesaCumplimiento: MesaCumplimientoService,
    private readonly resultadosService: ResultadosService,
    private readonly acceso: AccesoModuloService,
    private readonly fichas: FichasService,
    private readonly runner: RunnerService,
  ) {}

  /* ---------------------------------------------------------------- *
   * Partidas de juegos con mecanica real
   * ---------------------------------------------------------------- */

  /** Expedientes de la partida, sin las respuestas correctas. */
  async armarPartida(quien: UsuarioAutenticado, moduloId: string) {
    const configuracion = await this.configuracionJugable(quien, moduloId);
    return {
      juego: { clave: configuracion.juego.clave, nombre: configuracion.juego.nombre },
      titulo: configuracion.titulo,
      instrucciones: configuracion.instrucciones,
      tiempoLimiteSegundos: configuracion.tiempoLimiteSegundos,
      // El fondo es una convencion de archivo, no un dato configurable: el
      // cliente lo pide y si no existe dibuja su degradado de respaldo.
      escena: { fondo: FONDO_MESA },
      casos: await this.mesaCumplimiento.armarPartida(
        configuracion.paresContenido,
        quien.institucionId,
      ),
    };
  }

  /** Feedback inmediato tras decidir un caso. */
  verificarCaso(casoId: string, decision: Decision) {
    return this.mesaCumplimiento.verificar(casoId, decision);
  }

  /** Califica en el servidor y registra el intento del estudiante. */
  async terminarPartida(
    quien: UsuarioAutenticado,
    moduloId: string,
    respuestas: RespuestaJugador[],
  ) {
    const configuracion = await this.configuracionJugable(quien, moduloId);
    const calificacion = await this.mesaCumplimiento.calificar(respuestas);
    const resultado = await this.resultadosService.crear(quien, {
      moduloId,
      puntaje: calificacion.puntaje,
    });

    return {
      calificacion,
      intento: resultado.intento,
      puntaje: resultado.puntaje,
      nota: resultado.nota,
      puntajeMaximo: configuracion.puntajeMaximo,
    };
  }

  private configuracionJugable(
    quien: UsuarioAutenticado,
    moduloId: string,
  ): Promise<ConfiguracionJuego> {
    return this.acceso.configuracionDe(quien, moduloId, CLAVE_MESA_CUMPLIMIENTO);
  }

  listarCatalogo(): Promise<Juego[]> {
    return this.juegosRepo.find({ order: { nombre: 'ASC' } });
  }

  async obtenerConfiguracion(
    quien: UsuarioAutenticado,
    moduloId: string,
  ): Promise<ConfiguracionJuego | null> {
    await this.acceso.modulo(quien, moduloId, false);
    return this.configuracionesRepo.findOne({ where: { moduloId } });
  }

  async configurar(
    quien: UsuarioAutenticado,
    moduloId: string,
    datos: ConfigurarJuegoDto,
  ): Promise<ConfiguracionJuego> {
    const modulo = await this.acceso.modulo(quien, moduloId, true);
    const juego = await this.juegosRepo.findOne({ where: { id: datos.juegoId } });
    if (!juego) throw new NotFoundException('Plantilla de juego no encontrada');
    const ajustes = await this.ajustesDe(quien, juego, datos);

    let configuracion = await this.configuracionesRepo.findOne({ where: { moduloId } });
    if (!configuracion) {
      configuracion = this.configuracionesRepo.create({ moduloId });
    }
    configuracion.juegoId = juego.id;
    configuracion.titulo = datos.titulo;
    configuracion.instrucciones = datos.instrucciones ?? '';
    configuracion.velocidad = datos.velocidad;
    configuracion.tiempoLimiteSegundos = datos.tiempoLimiteSegundos;
    configuracion.paresContenido = datos.paresContenido;
    configuracion.intentosPermitidos = datos.intentosPermitidos;
    configuracion.puntajeMaximo = datos.puntajeMaximo;
    configuracion.ajustes = ajustes;
    await this.configuracionesRepo.save(configuracion);

    // Un juego ludico nunca califica, aunque el modulo calificara antes.
    const califica = juego.tipo === 'ludico' ? false : datos.califica;
    if (califica !== undefined && modulo.califica !== califica) {
      modulo.califica = califica;
      await this.modulosRepo.save(modulo);
    }

    return this.configuracionesRepo.findOneOrFail({ where: { moduloId } });
  }

  /** Cada juego valida lo suyo; los que no tienen ajustes propios guardan {}. */
  private ajustesDe(
    quien: UsuarioAutenticado,
    juego: Juego,
    datos: ConfigurarJuegoDto,
  ): Promise<Record<string, unknown>> {
    const ajustes = datos.ajustes ?? {};
    if (juego.clave === CLAVE_MEMORAMA || juego.clave === CLAVE_MAHJONG) {
      return this.fichas.validarAjustes(quien, juego.clave, ajustes, datos.paresContenido);
    }
    if (juego.clave === CLAVE_RUNNER) {
      return this.runner.validarAjustes(quien, ajustes);
    }
    return Promise.resolve({});
  }
}
