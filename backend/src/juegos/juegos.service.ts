import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Juego } from './juego.entidad';
import { ConfiguracionJuego } from './configuracion-juego.entidad';
import { ModuloCurso } from '../cursos/modulo-curso.entidad';
import { Rol } from '../comun/enums/rol.enum';
import { UsuarioAutenticado } from '../comun/tipos/usuario-autenticado';
import { ConfigurarJuegoDto } from './dto/configurar-juego.dto';

@Injectable()
export class JuegosService {
  constructor(
    @InjectRepository(Juego)
    private readonly juegosRepo: Repository<Juego>,
    @InjectRepository(ConfiguracionJuego)
    private readonly configuracionesRepo: Repository<ConfiguracionJuego>,
    @InjectRepository(ModuloCurso)
    private readonly modulosRepo: Repository<ModuloCurso>,
  ) {}

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
