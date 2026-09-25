import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Juego } from './juego.entidad';
import { ConfiguracionJuego } from './configuracion-juego.entidad';
import { ModuloCurso } from '../cursos/modulo-curso.entidad';
import { Rol } from '../comun/enums/rol.enum';
import { UsuarioAutenticado } from '../comun/tipos/usuario-autenticado';
import { ConfigurarJuegoDto } from './dto/configurar-juego.dto';
import { ResultadosService } from '../resultados/resultados.service';
import {
  MesaCumplimientoService,
  RespuestaJugador,
} from './mesa-cumplimiento/mesa-cumplimiento.service';
import { Decision } from './mesa-cumplimiento/casos';
import { FONDO_MESA } from '../archivos/archivos.constantes';

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

  private async configuracionJugable(
    quien: UsuarioAutenticado,
    moduloId: string,
  ): Promise<ConfiguracionJuego> {
    await this.moduloConAcceso(quien, moduloId, false);
    const configuracion = await this.configuracionesRepo.findOne({ where: { moduloId } });
    if (!configuracion) {
      throw new BadRequestException('El modulo no tiene un juego configurado');
    }
    if (configuracion.juego.clave !== CLAVE_MESA_CUMPLIMIENTO) {
      throw new BadRequestException('Este juego todavia no tiene mecanica jugable');
    }
    return configuracion;
  }

  listarCatalogo(): Promise<Juego[]> {
    return this.juegosRepo.find({ order: { nombre: 'ASC' } });
  }

  async obtenerConfiguracion(
    quien: UsuarioAutenticado,
    moduloId: string,
  ): Promise<ConfiguracionJuego | null> {
    await this.moduloConAcceso(quien, moduloId, false);
    return this.configuracionesRepo.findOne({ where: { moduloId } });
  }

  async configurar(
    quien: UsuarioAutenticado,
    moduloId: string,
    datos: ConfigurarJuegoDto,
  ): Promise<ConfiguracionJuego> {
    const modulo = await this.moduloConAcceso(quien, moduloId, true);
    const juego = await this.juegosRepo.findOne({ where: { id: datos.juegoId } });
    if (!juego) throw new NotFoundException('Plantilla de juego no encontrada');

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
    await this.configuracionesRepo.save(configuracion);

    if (datos.califica !== undefined && modulo.califica !== datos.califica) {
      modulo.califica = datos.califica;
      await this.modulosRepo.save(modulo);
    }

    return this.configuracionesRepo.findOneOrFail({ where: { moduloId } });
  }

  private async moduloConAcceso(
    quien: UsuarioAutenticado,
    moduloId: string,
    requiereEscritura: boolean,
  ): Promise<ModuloCurso> {
    const modulo = await this.modulosRepo.findOne({
      where: { id: moduloId },
      relations: ['curso'],
    });
    if (!modulo) throw new NotFoundException('Modulo no encontrado');

    if (quien.rol === Rol.SUPERADMIN) return modulo;
    if (quien.rol === Rol.ADMIN_INSTITUCION) {
      if (modulo.curso.institucionId !== quien.institucionId) {
        throw new ForbiddenException('No tienes acceso a este modulo');
      }
      return modulo;
    }
    if (quien.rol === Rol.DOCENTE) {
      if (requiereEscritura && modulo.curso.docenteId !== quien.id) {
        throw new ForbiddenException('Solo el docente del curso puede configurar el juego');
      }
      if (modulo.curso.institucionId !== quien.institucionId) {
        throw new ForbiddenException('No tienes acceso a este modulo');
      }
      return modulo;
    }
    if (requiereEscritura) {
      throw new ForbiddenException('Los estudiantes no pueden configurar juegos');
    }
    return modulo;
  }
}
