import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Resultado } from './resultado.entidad';
import { ModuloCurso } from '../cursos/modulo-curso.entidad';
import { Inscripcion } from '../inscripciones/inscripcion.entidad';
import { ConfiguracionJuego } from '../juegos/configuracion-juego.entidad';
import { Rol } from '../comun/enums/rol.enum';
import { UsuarioAutenticado } from '../comun/tipos/usuario-autenticado';
import { CrearResultadoDto } from './dto/crear-resultado.dto';

@Injectable()
export class ResultadosService {
  constructor(
    @InjectRepository(Resultado)
    private readonly resultadosRepo: Repository<Resultado>,
    @InjectRepository(ModuloCurso)
    private readonly modulosRepo: Repository<ModuloCurso>,
    @InjectRepository(Inscripcion)
    private readonly inscripcionesRepo: Repository<Inscripcion>,
    @InjectRepository(ConfiguracionJuego)
    private readonly configuracionesRepo: Repository<ConfiguracionJuego>,
  ) {}

  /**
   * Puntaje que calcula el navegador (en Ludus o en el paquete SCORM). Solo
   * se acepta en juegos ludicos, que no generan nota: los de evaluacion
   * calculan su puntaje en el servidor y llaman directo a `crear`.
   */
  async crearDesdeCliente(quien: UsuarioAutenticado, datos: CrearResultadoDto): Promise<Resultado> {
    const configuracion = await this.configuracionesRepo.findOne({
      where: { moduloId: datos.moduloId },
      relations: ['juego'],
    });
    if (!configuracion) throw new BadRequestException('Este modulo no tiene un juego configurado');
    if (configuracion.juego.tipo !== 'ludico') {
      throw new BadRequestException('El puntaje de este juego lo calcula Ludus al terminar la partida');
    }
    return this.crear(quien, datos);
  }

  async listar(quien: UsuarioAutenticado): Promise<Resultado[]> {
    const consulta = this.resultadosRepo
      .createQueryBuilder('resultado')
      .leftJoinAndSelect('resultado.estudiante', 'estudiante')
      .leftJoinAndSelect('resultado.modulo', 'modulo')
      .leftJoinAndSelect('modulo.curso', 'curso')
      .orderBy('resultado.creadoEn', 'DESC');

    if (quien.rol === Rol.ESTUDIANTE) {
      consulta.andWhere('resultado.estudianteId = :id', { id: quien.id });
    } else if (quien.rol === Rol.DOCENTE) {
      consulta.andWhere('curso.docenteId = :docenteId', { docenteId: quien.id });
    } else if (quien.rol === Rol.ADMIN_INSTITUCION) {
      consulta.andWhere('curso.institucionId = :institucionId', {
        institucionId: quien.institucionId,
      });
    }
    return consulta.getMany();
  }

  async crear(quien: UsuarioAutenticado, datos: CrearResultadoDto): Promise<Resultado> {
    if (quien.rol !== Rol.ESTUDIANTE) {
      throw new ForbiddenException('Solo un estudiante registra resultados de juego');
    }
    const modulo = await this.modulosRepo.findOne({
      where: { id: datos.moduloId },
      relations: ['curso'],
    });
    if (!modulo) throw new NotFoundException('Modulo no encontrado');

    const inscrito = await this.inscripcionesRepo.findOne({
      where: { estudianteId: quien.id, cursoId: modulo.cursoId },
    });
    if (!inscrito) {
      throw new ForbiddenException('No estas inscrito en el curso de este modulo');
    }

    const intentosPrevios = await this.resultadosRepo.count({
      where: { estudianteId: quien.id, moduloId: modulo.id },
    });
    const puntajeAcotado = Math.min(datos.puntaje, 100);
    const nota = modulo.califica ? (puntajeAcotado / 10).toFixed(1) : null;

    const resultado = this.resultadosRepo.create({
      estudianteId: quien.id,
      moduloId: modulo.id,
      intento: intentosPrevios + 1,
      puntaje: datos.puntaje,
      nota,
    });
    return this.resultadosRepo.save(resultado);
  }
}
