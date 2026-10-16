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
import { Rol } from '../../comun/enums/rol.enum';
import { UsuarioAutenticado } from '../../comun/tipos/usuario-autenticado';
import { GuardarHistoriaDto, PreguntaHistoriaDto } from './dto/historia.dto';
import { leerLinkVideo, linkCanonico } from './videos-externos';

/**
 * Historias del Runner Narrativo. Los videos no se suben a Ludus: el docente
 * pega el link de YouTube o de Google Drive y la historia guarda ese link,
 * normalizado, en el orden en que se juegan las preguntas.
 */
@Injectable()
export class HistoriasService {
  constructor(
    @InjectRepository(Historia)
    private readonly historiasRepo: Repository<Historia>,
    @InjectRepository(ConfiguracionJuego)
    private readonly configuracionesRepo: Repository<ConfiguracionJuego>,
  ) {}

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
    return this.guardar(historia, datos);
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
    const videoIntro = this.link(datos.videoIntro, 'La intro');

    // Las preguntas que ya existian conservan su id y el de sus opciones: una
    // partida en curso sigue valiendo despues de corregir un texto.
    const previas = new Map(historia.preguntas.map((pregunta) => [pregunta.id, pregunta]));
    historia.nombre = datos.nombre;
    historia.videoIntro = videoIntro;
    historia.preguntas = datos.preguntas.map((pregunta, indice) => this.normalizar(pregunta, indice, previas));
    return this.historiasRepo.save(historia);
  }

  private normalizar(
    pregunta: PreguntaHistoriaDto,
    indice: number,
    previas: Map<string, PreguntaRunner>,
  ): PreguntaRunner {
    const previa = pregunta.id ? previas.get(pregunta.id) : undefined;
    return {
      id: previa?.id ?? randomUUID(),
      texto: pregunta.texto,
      respuestaCorrecta: pregunta.respuestaCorrecta,
      respuestaIncorrecta: pregunta.respuestaIncorrecta,
      videoBueno: this.link(pregunta.videoBueno, `El video de acierto de la pregunta ${indice + 1}`),
      videoMalo: this.link(pregunta.videoMalo, `El video de error de la pregunta ${indice + 1}`),
      opcionCorrectaId: previa?.opcionCorrectaId ?? randomUUID(),
      opcionIncorrectaId: previa?.opcionIncorrectaId ?? randomUUID(),
    };
  }

  /** Vacio = sin video. Un link que no es de YouTube ni de Drive se rechaza. */
  private link(texto: string | null | undefined, que: string): string | null {
    if (!texto || !texto.trim()) return null;
    const video = leerLinkVideo(texto);
    if (!video) {
      throw new BadRequestException(
        `${que} no es un link de YouTube ni de Google Drive. Copia el link de "Compartir" del video.`,
      );
    }
    return linkCanonico(video);
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
