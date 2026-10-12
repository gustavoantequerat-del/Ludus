import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ModuloCurso } from '../cursos/modulo-curso.entidad';
import { ConfiguracionJuego } from './configuracion-juego.entidad';
import { Rol } from '../comun/enums/rol.enum';
import { UsuarioAutenticado } from '../comun/tipos/usuario-autenticado';

/**
 * Quien puede ver o configurar el juego de un modulo. Vive aparte porque lo
 * usan todos los juegos: la configuracion general y la partida de cada uno.
 */
@Injectable()
export class AccesoModuloService {
  constructor(
    @InjectRepository(ModuloCurso)
    private readonly modulosRepo: Repository<ModuloCurso>,
    @InjectRepository(ConfiguracionJuego)
    private readonly configuracionesRepo: Repository<ConfiguracionJuego>,
  ) {}

  async modulo(
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

  /** La configuracion del modulo, siempre que sea del juego que se pide. */
  async configuracionDe(
    quien: UsuarioAutenticado,
    moduloId: string,
    clave: string,
  ): Promise<ConfiguracionJuego> {
    await this.modulo(quien, moduloId, false);
    const configuracion = await this.configuracionesRepo.findOne({ where: { moduloId } });
    if (!configuracion) {
      throw new BadRequestException('El modulo no tiene un juego configurado');
    }
    if (configuracion.juego.clave !== clave) {
      throw new BadRequestException('Este modulo no tiene configurado ese juego');
    }
    return configuracion;
  }
}
