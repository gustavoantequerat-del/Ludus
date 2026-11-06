import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CursosService } from './cursos.service';
import { Inscripcion } from '../inscripciones/inscripcion.entidad';
import { Resultado } from '../resultados/resultado.entidad';
import { Rol } from '../comun/enums/rol.enum';
import { UsuarioAutenticado } from '../comun/tipos/usuario-autenticado';
import { calcularRanking, FilaRanking } from './ranking-calculo';

/** Cuantos puestos se muestran con nombre a los estudiantes (el podio). */
const PODIO = 3;

/**
 * Ranking de un curso, calculado al consultar (no se guarda): con los
 * resultados que hay en ese momento. Ver ranking-calculo.ts para las reglas.
 *
 * El docente y los admins ven a todos con nombre, y quienes van en progreso.
 * Un estudiante ve con nombre solo el podio y su propia fila; el resto de la
 * tabla le llega anonimo y sin ids.
 */
@Injectable()
export class RankingCursoService {
  constructor(
    private readonly cursos: CursosService,
    @InjectRepository(Inscripcion)
    private readonly inscripcionesRepo: Repository<Inscripcion>,
    @InjectRepository(Resultado)
    private readonly resultadosRepo: Repository<Resultado>,
  ) {}

  async ranking(quien: UsuarioAutenticado, cursoId: string) {
    // obtener() ya valida que quien consulta tenga acceso al curso.
    const curso = await this.cursos.obtener(quien, cursoId);
    const modulos = curso.modulos.filter((m) => m.califica && m.configuracionJuego);
    const ids = modulos.map((m) => m.id);

    const [inscripciones, mejores] = await Promise.all([
      this.inscripcionesRepo
        .createQueryBuilder('inscripcion')
        .innerJoin('inscripcion.estudiante', 'estudiante')
        .select('estudiante.id', 'estudianteId')
        .addSelect('estudiante.nombre', 'nombre')
        .where('inscripcion.cursoId = :cursoId', { cursoId })
        .getRawMany<{ estudianteId: string; nombre: string }>(),
      ids.length === 0
        ? Promise.resolve([])
        : this.resultadosRepo
            .createQueryBuilder('resultado')
            .select('resultado.estudianteId', 'estudianteId')
            .addSelect('resultado.moduloId', 'moduloId')
            .addSelect('MAX(resultado.puntaje)', 'mejor')
            .addSelect('MIN(resultado.creadoEn)', 'primero')
            .where('resultado.moduloId IN (:...ids)', { ids })
            .groupBy('resultado.estudianteId')
            .addGroupBy('resultado.moduloId')
            .getRawMany<{ estudianteId: string; moduloId: string; mejor: string; primero: Date }>(),
    ]);

    const { ranking, enProgreso } = calcularRanking(
      ids,
      inscripciones,
      mejores.map((f) => ({ ...f, mejor: Number(f.mejor), primero: new Date(f.primero) })),
    );
    const base = {
      curso: { id: curso.id, nombre: curso.nombre },
      totalModulos: ids.length,
      totalInscritos: inscripciones.length,
      terminaron: ranking.length,
      calculadoEn: new Date(),
    };

    if (quien.rol !== Rol.ESTUDIANTE) {
      return { ...base, vista: 'docente' as const, ranking: ranking.map((f) => this.fila(f, quien)), enProgreso };
    }

    const mia = ranking.find((f) => f.estudianteId === quien.id) ?? null;
    const progreso = enProgreso.find((f) => f.estudianteId === quien.id);
    return {
      ...base,
      vista: 'estudiante' as const,
      ranking: ranking.map((f) =>
        f.posicion <= PODIO || f.estudianteId === quien.id
          ? this.fila(f, quien)
          : { ...this.fila(f, quien), nombre: `Estudiante ${f.posicion}` },
      ),
      miPosicion: mia?.posicion ?? null,
      miProgreso: progreso ? { completados: progreso.completados, notaParcial: progreso.notaParcial } : null,
    };
  }

  /** Lo que viaja de cada fila: sin el id del estudiante. */
  private fila(f: FilaRanking, quien: UsuarioAutenticado) {
    return {
      posicion: f.posicion,
      nombre: f.nombre,
      nota: f.nota,
      promedio: f.promedio,
      terminadoEn: f.terminadoEn,
      esYo: f.estudianteId === quien.id,
    };
  }
}
