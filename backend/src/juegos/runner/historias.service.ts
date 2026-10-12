import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { Historia, PreguntaRunner } from './historia.entidad';
import { ConfiguracionJuego } from '../configuracion-juego.entidad';
import { ArchivosService, LIMITES_VIDEO } from '../../archivos/archivos.service';
import { CARPETA_VIDEOS, PATRON_ARCHIVO_SUBIDO } from '../../archivos/archivos.constantes';
import { Rol } from '../../comun/enums/rol.enum';
import { UsuarioAutenticado } from '../../comun/tipos/usuario-autenticado';
import { GuardarHistoriaDto, PreguntaHistoriaDto } from './dto/historia.dto';

/**
 * Historias del Runner Narrativo: el docente sube los videos de a uno y la
 * historia guarda sus rutas, en el orden en que se juegan las preguntas.
 */
@Injectable()
export class HistoriasService {
  constructor(
    @InjectRepository(Historia)
    private readonly historiasRepo: Repository<Historia>,
    @InjectRepository(ConfiguracionJuego)
    private readonly configuracionesRepo: Repository<ConfiguracionJuego>,
    private readonly archivos: ArchivosService,
  ) {}

  limites() {
    return {
      formato: 'MP4 (H.264)',
      maximoSegundos: LIMITES_VIDEO.maximoSegundos,
      maximoMegas: LIMITES_VIDEO.maximoBytes / (1024 * 1024),
    };
  }

  async subirVideo(contenido: Buffer): Promise<{ ruta: string }> {
    return { ruta: await this.archivos.guardarVideo(contenido) };
  }

  /** Las propias de la institucion mas las del catalogo base. */
  listar(quien: UsuarioAutenticado): Promise<Historia[]> {
    const consulta = this.historiasRepo
      .createQueryBuilder('historia')
      .orderBy('historia.institucionId', 'ASC', 'NULLS LAST')
      .addOrderBy('historia.nombre', 'ASC');
    if (quien.rol !== Rol.SUPERADMIN) {
      consulta.where('(historia.institucionId = :institucionId OR historia.institucionId IS NULL)', {
        institucionId: quien.institucionId,
      });
    }
    return consulta.getMany();
  }

  async crear(quien: UsuarioAutenticado, datos: GuardarHistoriaDto): Promise<Historia> {
    const historia = this.historiasRepo.create({
      institucionId: quien.rol === Rol.SUPERADMIN ? null : quien.institucionId,
      preguntas: [],
    });
    return this.guardar(historia, datos);
  }

  async actualizar(quien: UsuarioAutenticado, id: string, datos: GuardarHistoriaDto): Promise<Historia> {
    const historia = await this.conAcceso(quien, id);
    const anteriores = this.videosDe(historia);
    const guardada = await this.guardar(historia, datos);

    const actuales = new Set(this.videosDe(guardada));
    await this.limpiarHuerfanos(anteriores.filter((ruta) => !actuales.has(ruta)));
    return guardada;
  }

  async eliminar(quien: UsuarioAutenticado, id: string): Promise<void> {
    const historia = await this.conAcceso(quien, id);
    const enUso = await this.configuracionesRepo
      .createQueryBuilder('configuracion')
      .where(`configuracion.ajustes ->> 'historiaId' = :id`, { id })
      .getCount();
    if (enUso > 0) {
      throw new BadRequestException(
        `Esta historia la usan ${enUso} modulo(s). Elige otra en su configuracion antes de borrarla.`,
      );
    }
    await this.historiasRepo.remove(historia);
    await this.limpiarHuerfanos(this.videosDe(historia));
  }

  /** Una historia que quien puede usar: la suya o una del catalogo base. */
  async visible(quien: UsuarioAutenticado, id: string): Promise<Historia> {
    const historia = await this.historiasRepo.findOne({ where: { id } });
    const ajena =
      historia &&
      quien.rol !== Rol.SUPERADMIN &&
      historia.institucionId !== null &&
      historia.institucionId !== quien.institucionId;
    if (!historia || ajena) throw new NotFoundException('La historia no existe');
    return historia;
  }

  /* ---------------------------------------------------------------- */

  private async guardar(historia: Historia, datos: GuardarHistoriaDto): Promise<Historia> {
    const videoIntro = datos.videoIntro || null;
    await this.validarVideos([videoIntro, ...datos.preguntas.flatMap((p) => [p.videoBueno, p.videoMalo])]);

    // Las preguntas que ya existian conservan su id y el de sus opciones: una
    // partida en curso sigue valiendo despues de corregir un texto.
    const previas = new Map(historia.preguntas.map((pregunta) => [pregunta.id, pregunta]));
    historia.nombre = datos.nombre;
    historia.videoIntro = videoIntro;
    historia.preguntas = datos.preguntas.map((pregunta) => this.normalizar(pregunta, previas));
    return this.historiasRepo.save(historia);
  }

  private normalizar(
    pregunta: PreguntaHistoriaDto,
    previas: Map<string, PreguntaRunner>,
  ): PreguntaRunner {
    const previa = pregunta.id ? previas.get(pregunta.id) : undefined;
    return {
      id: previa?.id ?? randomUUID(),
      texto: pregunta.texto,
      respuestaCorrecta: pregunta.respuestaCorrecta,
      respuestaIncorrecta: pregunta.respuestaIncorrecta,
      videoBueno: pregunta.videoBueno || null,
      videoMalo: pregunta.videoMalo || null,
      opcionCorrectaId: previa?.opcionCorrectaId ?? randomUUID(),
      opcionIncorrectaId: previa?.opcionIncorrectaId ?? randomUUID(),
    };
  }

  private videosDe(historia: Historia): string[] {
    return [
      historia.videoIntro,
      ...historia.preguntas.flatMap((pregunta) => [pregunta.videoBueno, pregunta.videoMalo]),
    ].filter((ruta): ruta is string => !!ruta);
  }

  private async validarVideos(rutas: (string | null | undefined)[]): Promise<void> {
    for (const ruta of new Set(rutas.filter((r): r is string => !!r))) {
      if (!(await this.archivos.existe(ruta, [CARPETA_VIDEOS]))) {
        throw new BadRequestException(`El video ${ruta} no esta en el servidor. Vuelve a subirlo.`);
      }
    }
  }

  /** Borra los videos subidos que ya ninguna historia usa. */
  private async limpiarHuerfanos(rutas: string[]): Promise<void> {
    for (const ruta of new Set(rutas)) {
      if (!PATRON_ARCHIVO_SUBIDO.test(ruta)) continue;
      const enUso = await this.historiasRepo
        .createQueryBuilder('historia')
        .where('historia.videoIntro = :ruta', { ruta })
        .orWhere('historia.preguntas @> :bueno::jsonb', { bueno: JSON.stringify([{ videoBueno: ruta }]) })
        .orWhere('historia.preguntas @> :malo::jsonb', { malo: JSON.stringify([{ videoMalo: ruta }]) })
        .getCount();
      if (enUso === 0) await this.archivos.eliminarImagen(ruta);
    }
  }

  /** El catalogo base solo lo toca el superadmin. */
  private async conAcceso(quien: UsuarioAutenticado, id: string): Promise<Historia> {
    const historia = await this.historiasRepo.findOne({ where: { id } });
    if (!historia) throw new NotFoundException('La historia no existe');
    if (quien.rol === Rol.SUPERADMIN) return historia;

    if (historia.institucionId === null) {
      throw new ForbiddenException('Las historias del catalogo base solo las edita el superadmin');
    }
    if (historia.institucionId !== quien.institucionId) {
      throw new ForbiddenException('No tienes acceso a esta historia');
    }
    return historia;
  }
}
