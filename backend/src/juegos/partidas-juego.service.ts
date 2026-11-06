import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PartidaJuego } from './partida-juego.entidad';
import { UsuarioAutenticado } from '../comun/tipos/usuario-autenticado';

/** Margen sobre el limite de tiempo, por la latencia y el reloj del navegador. */
const GRACIA_MS = 20_000;

/**
 * Partidas de la Mesa de Cumplimiento y del Runner guardadas en el servidor:
 * se crean con las preguntas que se le dan al estudiante, guardan la primera
 * respuesta de cada una y se cierran una sola vez.
 */
@Injectable()
export class PartidasJuegoService {
  constructor(
    @InjectRepository(PartidaJuego)
    private readonly partidasRepo: Repository<PartidaJuego>,
  ) {}

  crear(quien: UsuarioAutenticado, moduloId: string, juego: string, ids: string[]): Promise<PartidaJuego> {
    return this.partidasRepo.save(
      this.partidasRepo.create({
        moduloId,
        estudianteId: quien.id,
        juego,
        preguntas: ids.map((id) => ({ id, respuesta: null, correcta: null })),
      }),
    );
  }

  /** La partida del estudiante, de ese modulo y juego, todavia abierta. */
  async abierta(quien: UsuarioAutenticado, partidaId: string | undefined, moduloId: string, juego: string) {
    if (!partidaId) {
      throw new BadRequestException(
        'Falta la partida. Si juegas desde un LMS, este paquete SCORM es de una version anterior: pide uno nuevo a tu docente.',
      );
    }
    const partida = await this.partidasRepo.findOne({ where: { id: partidaId } }).catch(() => null);
    if (!partida || partida.estudianteId !== quien.id || partida.moduloId !== moduloId || partida.juego !== juego) {
      throw new NotFoundException('La partida no existe');
    }
    if (partida.terminada) throw new BadRequestException('Esta partida ya termino');
    return partida;
  }

  async moduloDe(partidaId: string): Promise<string | null> {
    const partida = await this.partidasRepo.findOne({ where: { id: partidaId }, select: ['id', 'moduloId'] }).catch(() => null);
    return partida?.moduloId ?? null;
  }

  /** Corta si ya paso el limite de tiempo (0 = sin limite). */
  exigirTiempo(partida: PartidaJuego, limiteSegundos: number) {
    if (limiteSegundos > 0 && Date.now() > partida.iniciadaEn.getTime() + limiteSegundos * 1000 + GRACIA_MS) {
      throw new ConflictException('Se acabo el tiempo de la partida');
    }
  }

  /** Guarda la respuesta si es la primera a esa pregunta; si ya respondio, devuelve la guardada. */
  async responder(partida: PartidaJuego, preguntaId: string, respuesta: string, correcta: boolean) {
    const pregunta = partida.preguntas.find((p) => p.id === preguntaId);
    if (!pregunta) throw new BadRequestException('Esa pregunta no es de esta partida');
    if (pregunta.respuesta !== null) return pregunta;
    pregunta.respuesta = respuesta;
    pregunta.correcta = correcta;
    partida.respondidas = partida.preguntas.filter((p) => p.respuesta !== null).length;
    await this.partidasRepo.save(partida);
    return pregunta;
  }

  /** Cierra la partida una sola vez (si dos pedidos llegan juntos, solo uno la cierra). */
  async cerrar(partida: PartidaJuego) {
    const resultado = await this.partidasRepo
      .createQueryBuilder()
      .update(PartidaJuego)
      .set({ terminada: true })
      .where('id = :id AND terminada = false', { id: partida.id })
      .execute();
    if (!resultado.affected) throw new BadRequestException('Esta partida ya termino');
  }
}
