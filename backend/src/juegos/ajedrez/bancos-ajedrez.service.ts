import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { BancoAjedrez, PreguntaAjedrez } from './banco-ajedrez.entidad';
import { ConfiguracionJuego } from '../configuracion-juego.entidad';
import { Rol } from '../../comun/enums/rol.enum';
import { UsuarioAutenticado } from '../../comun/tipos/usuario-autenticado';
import { GuardarBancoAjedrezDto, MINIMO_PREGUNTAS_BANCO, PreguntaBancoDto } from './dto/banco-ajedrez.dto';

/**
 * Bancos de preguntas del Ajedrez de Preguntas. Mismo alcance que los mazos y
 * las historias: los de la institucion mas el catalogo base (institucion_id
 * null), que solo edita el superadmin.
 */
@Injectable()
export class BancosAjedrezService {
  constructor(
    @InjectRepository(BancoAjedrez)
    private readonly bancosRepo: Repository<BancoAjedrez>,
    @InjectRepository(ConfiguracionJuego)
    private readonly configuracionesRepo: Repository<ConfiguracionJuego>,
  ) {}

  listar(quien: UsuarioAutenticado): Promise<BancoAjedrez[]> {
    const consulta = this.bancosRepo
      .createQueryBuilder('banco')
      .orderBy('banco.institucionId', 'ASC', 'NULLS LAST')
      .addOrderBy('banco.nombre', 'ASC');
    if (quien.rol !== Rol.SUPERADMIN) {
      consulta.where('(banco.institucionId = :institucionId OR banco.institucionId IS NULL)', {
        institucionId: quien.institucionId,
      });
    }
    return consulta.getMany();
  }

  crear(quien: UsuarioAutenticado, datos: GuardarBancoAjedrezDto): Promise<BancoAjedrez> {
    const banco = this.bancosRepo.create({
      institucionId: quien.rol === Rol.SUPERADMIN ? null : quien.institucionId,
      preguntas: [],
    });
    return this.guardar(banco, datos);
  }

  async actualizar(quien: UsuarioAutenticado, id: string, datos: GuardarBancoAjedrezDto): Promise<BancoAjedrez> {
    return this.guardar(await this.conAcceso(quien, id), datos);
  }

  async eliminar(quien: UsuarioAutenticado, id: string): Promise<void> {
    const banco = await this.conAcceso(quien, id);
    const enUso = await this.configuracionesRepo
      .createQueryBuilder('configuracion')
      .where(`configuracion.ajustes ->> 'bancoId' = :id`, { id })
      .getCount();
    if (enUso > 0) {
      throw new BadRequestException(
        `Este banco lo usan ${enUso} modulo(s). Elige otro en su configuracion antes de borrarlo.`,
      );
    }
    await this.bancosRepo.remove(banco);
  }

  /** Un banco que quien puede usar: el suyo o uno del catalogo base. */
  async visible(quien: UsuarioAutenticado, id: string): Promise<BancoAjedrez> {
    const banco = await this.bancosRepo.findOne({ where: { id } });
    const ajeno =
      banco &&
      quien.rol !== Rol.SUPERADMIN &&
      banco.institucionId !== null &&
      banco.institucionId !== quien.institucionId;
    if (!banco || ajeno) throw new NotFoundException('El banco de preguntas no existe');
    return banco;
  }

  /** Para una partida ya empezada: el banco por id, sin revisar alcance otra vez. */
  porId(id: string): Promise<BancoAjedrez | null> {
    return this.bancosRepo.findOne({ where: { id } });
  }

  /**
   * Lo que exige un banco para jugarse; null si esta listo. Se revisa al
   * elegirlo en un modulo y al empezar cada partida, no al guardar: un banco
   * se puede ir armando de a poco.
   */
  problemaParaJugar(banco: BancoAjedrez): string | null {
    if (banco.preguntas.length < MINIMO_PREGUNTAS_BANCO) {
      return `El banco "${banco.nombre}" tiene ${banco.preguntas.length} pregunta(s); necesita al menos ${MINIMO_PREGUNTAS_BANCO}`;
    }
    if (banco.minimoPreguntas > banco.preguntas.length) {
      return `El minimo de preguntas del banco "${banco.nombre}" (${banco.minimoPreguntas}) es mayor que sus preguntas (${banco.preguntas.length})`;
    }
    return null;
  }

  /* ---------------------------------------------------------------- */

  private guardar(banco: BancoAjedrez, datos: GuardarBancoAjedrezDto): Promise<BancoAjedrez> {
    datos.preguntas.forEach((pregunta, indice) => {
      const repetidas = new Set(pregunta.opciones.map((o) => o.trim().toLowerCase()));
      if (repetidas.size < 4) {
        throw new BadRequestException(`La pregunta ${indice + 1} tiene opciones repetidas`);
      }
    });

    // Las preguntas que ya existian conservan su id y el de sus opciones: una
    // partida en curso sigue valiendo despues de corregir un texto.
    const previas = new Map(banco.preguntas.map((pregunta) => [pregunta.id, pregunta]));
    banco.nombre = datos.nombre;
    banco.minutos = datos.minutos;
    banco.minimoPreguntas = datos.minimoPreguntas;
    banco.preguntas = datos.preguntas.map((pregunta) => this.normalizar(pregunta, previas));
    return this.bancosRepo.save(banco);
  }

  private normalizar(pregunta: PreguntaBancoDto, previas: Map<string, PreguntaAjedrez>): PreguntaAjedrez {
    const previa = pregunta.id ? previas.get(pregunta.id) : undefined;
    const opciones = pregunta.opciones.map((texto, indice) => ({
      id: previa?.opciones[indice]?.id ?? randomUUID(),
      texto: texto.trim(),
    }));
    return {
      id: previa?.id ?? randomUUID(),
      texto: pregunta.texto.trim(),
      opciones,
      correctaId: opciones[pregunta.correcta].id,
      dificil: pregunta.dificil,
    };
  }

  /** El catalogo base solo lo toca el superadmin. */
  private async conAcceso(quien: UsuarioAutenticado, id: string): Promise<BancoAjedrez> {
    const banco = await this.bancosRepo.findOne({ where: { id } });
    if (!banco) throw new NotFoundException('El banco de preguntas no existe');
    if (quien.rol === Rol.SUPERADMIN) return banco;
    if (banco.institucionId === null) {
      throw new ForbiddenException('Los bancos del catalogo base solo los edita el superadmin');
    }
    if (banco.institucionId !== quien.institucionId) {
      throw new ForbiddenException('No tienes acceso a este banco');
    }
    return banco;
  }
}
