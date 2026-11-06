import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Resultado } from './resultado.entidad';
import { PartidaJuego } from '../juegos/partida-juego.entidad';
import { PartidaAjedrez } from '../juegos/ajedrez/partida-ajedrez.entidad';
import { Rol } from '../comun/enums/rol.enum';
import { UsuarioAutenticado } from '../comun/tipos/usuario-autenticado';

/**
 * Intentos de un estudiante en un modulo: los que termino (tienen resultado)
 * mas los que dejo a medias despues de responder algo. Abrir un juego y
 * salir sin responder nada no gasta intento; abandonar una partida empezada,
 * si (si no, bastaria con recargar para borrar una mala partida).
 */
@Injectable()
export class IntentosService {
  constructor(
    @InjectRepository(Resultado)
    private readonly resultadosRepo: Repository<Resultado>,
    @InjectRepository(PartidaJuego)
    private readonly partidasRepo: Repository<PartidaJuego>,
    @InjectRepository(PartidaAjedrez)
    private readonly partidasAjedrezRepo: Repository<PartidaAjedrez>,
  ) {}

  async usados(estudianteId: string, moduloId: string): Promise<number> {
    const [terminados, juegoAMedias, ajedrezAMedias] = await Promise.all([
      this.resultadosRepo.count({ where: { estudianteId, moduloId } }),
      this.partidasRepo
        .createQueryBuilder('partida')
        .where('partida.estudianteId = :estudianteId AND partida.moduloId = :moduloId', { estudianteId, moduloId })
        .andWhere('partida.terminada = false AND partida.respondidas > 0')
        .getCount(),
      this.partidasAjedrezRepo
        .createQueryBuilder('partida')
        .where('partida.estudianteId = :estudianteId AND partida.moduloId = :moduloId', { estudianteId, moduloId })
        .andWhere("partida.estado <> 'terminada'")
        .andWhere(`jsonb_path_exists(partida.preguntas, '$[*] ? (@.opcionId != null)')`)
        .getCount(),
    ]);
    return terminados + juegoAMedias + ajedrezAMedias;
  }

  /** Antes de empezar una partida: corta si ya no quedan intentos (solo a estudiantes). */
  async exigirDisponible(quien: UsuarioAutenticado, moduloId: string, permitidos: number): Promise<void> {
    if (quien.rol !== Rol.ESTUDIANTE || !permitidos || permitidos <= 0) return;
    const usados = await this.usados(quien.id, moduloId);
    if (usados >= permitidos) {
      throw new ForbiddenException(
        permitidos === 1
          ? 'Este modulo permite un solo intento y ya lo usaste.'
          : `Ya usaste los ${permitidos} intentos de este modulo.`,
      );
    }
  }
}
