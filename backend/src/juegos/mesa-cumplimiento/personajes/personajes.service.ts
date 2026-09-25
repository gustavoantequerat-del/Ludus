import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { Personaje } from './personaje.entidad';
import { ArchivosService } from '../../../archivos/archivos.service';
import { CARPETA_PERSONAJES } from '../../../archivos/archivos.constantes';
import { Rol } from '../../../comun/enums/rol.enum';
import { UsuarioAutenticado } from '../../../comun/tipos/usuario-autenticado';
import { CrearPersonajeDto } from './dto/crear-personaje.dto';
import { ActualizarPersonajeDto } from './dto/actualizar-personaje.dto';

/**
 * Nombre que le pone guardarImagen a lo que se sube desde la aplicacion. Sirve
 * para distinguirlo de los assets que alguien dejo a mano en la carpeta, que
 * nunca se borran solos.
 */
const PATRON_SUBIDA = /\/[0-9a-f]{16}\.(png|jpg|webp)$/;

@Injectable()
export class PersonajesService {
  constructor(
    @InjectRepository(Personaje)
    private readonly personajesRepo: Repository<Personaje>,
    private readonly archivos: ArchivosService,
  ) {}

  /** Los propios de la institucion mas el catalogo base de Ludus. */
  async listar(quien: UsuarioAutenticado): Promise<Personaje[]> {
    const consulta = this.personajesRepo
      .createQueryBuilder('personaje')
      .orderBy('personaje.institucionId', 'ASC', 'NULLS LAST')
      .addOrderBy('personaje.nombre', 'ASC');

    if (quien.rol !== Rol.SUPERADMIN) {
      consulta.where(
        'personaje.institucionId = :institucionId OR personaje.institucionId IS NULL',
        { institucionId: quien.institucionId },
      );
    }
    return consulta.getMany();
  }

  /** Imagenes en la carpeta que todavia no son un personaje registrado. */
  async imagenesDisponibles(): Promise<string[]> {
    const [enDisco, registradas] = await Promise.all([
      this.archivos.listarImagenes(CARPETA_PERSONAJES),
      this.personajesRepo.find({ select: { imagen: true } }),
    ]);
    const usadas = new Set(registradas.map((personaje) => personaje.imagen));
    return enDisco.filter((ruta) => !usadas.has(ruta));
  }

  async crear(quien: UsuarioAutenticado, datos: CrearPersonajeDto): Promise<Personaje> {
    const personaje = this.personajesRepo.create({
      nombre: datos.nombre,
      cargo: datos.cargo ?? '',
      imagen: await this.resolverImagen(datos),
      // El catalogo base es del superadmin; el resto crea para su institucion.
      institucionId: quien.rol === Rol.SUPERADMIN ? null : quien.institucionId,
    });
    return this.personajesRepo.save(personaje);
  }

  async actualizar(
    quien: UsuarioAutenticado,
    id: string,
    datos: ActualizarPersonajeDto,
  ): Promise<Personaje> {
    const personaje = await this.conAcceso(quien, id);

    if (datos.nombre !== undefined) personaje.nombre = datos.nombre;
    if (datos.cargo !== undefined) personaje.cargo = datos.cargo;
    if (datos.imagenSubida || datos.imagenExistente) {
      const anterior = personaje.imagen;
      personaje.imagen = await this.resolverImagen(datos);
      await this.limpiarSiEsSubida(anterior, personaje.id);
    }

    return this.personajesRepo.save(personaje);
  }

  async eliminar(quien: UsuarioAutenticado, id: string): Promise<void> {
    const personaje = await this.conAcceso(quien, id);
    await this.personajesRepo.remove(personaje);
    await this.limpiarSiEsSubida(personaje.imagen, null);
  }

  /* ---------------------------------------------------------------- */

  private async resolverImagen(
    datos: CrearPersonajeDto | ActualizarPersonajeDto,
  ): Promise<string> {
    if (datos.imagenSubida) {
      return this.archivos.guardarImagen(CARPETA_PERSONAJES, datos.imagenSubida);
    }
    if (datos.imagenExistente) {
      const disponibles = await this.archivos.listarImagenes(CARPETA_PERSONAJES);
      if (!disponibles.includes(datos.imagenExistente)) {
        throw new BadRequestException('Esa imagen ya no esta en el servidor');
      }
      return datos.imagenExistente;
    }
    throw new BadRequestException('El personaje necesita una imagen');
  }

  /**
   * Borra del disco una imagen subida desde la aplicacion cuando deja de
   * usarse. Los archivos que alguien copio a mano en la carpeta se conservan:
   * vuelven a aparecer como imagen disponible.
   */
  private async limpiarSiEsSubida(imagen: string, exceptoId: string | null): Promise<void> {
    if (!PATRON_SUBIDA.test(imagen)) return;

    const enUso = await this.personajesRepo.count({
      where: { imagen, ...(exceptoId ? { id: Not(exceptoId) } : {}) },
    });
    if (enUso === 0) await this.archivos.eliminarImagen(imagen);
  }

  /** El catalogo base solo lo toca el superadmin. */
  private async conAcceso(quien: UsuarioAutenticado, id: string): Promise<Personaje> {
    const personaje = await this.personajesRepo.findOne({ where: { id } });
    if (!personaje) throw new NotFoundException('El personaje no existe');
    if (quien.rol === Rol.SUPERADMIN) return personaje;

    if (personaje.institucionId === null) {
      throw new ForbiddenException(
        'Los personajes del catalogo base solo los edita el superadmin',
      );
    }
    if (personaje.institucionId !== quien.institucionId) {
      throw new ForbiddenException('No tienes acceso a este personaje');
    }
    return personaje;
  }
}
