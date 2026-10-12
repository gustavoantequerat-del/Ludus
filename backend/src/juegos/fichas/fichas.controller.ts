import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtGuardia } from '../../comun/guardias/jwt.guardia';
import { RolesGuardia } from '../../comun/guardias/roles.guardia';
import { Roles } from '../../comun/decoradores/roles.decorador';
import { UsuarioActual } from '../../comun/decoradores/usuario-actual.decorador';
import { Rol } from '../../comun/enums/rol.enum';
import { UsuarioAutenticado } from '../../comun/tipos/usuario-autenticado';
import { FichasService } from './fichas.service';
import { CLAVE_MAHJONG, CLAVE_MEMORAMA } from '../catalogo-nuevos';

/**
 * Partidas de los juegos ludicos. No hay "terminar" propio: al no calificar,
 * el intento se registra con el POST /resultados de siempre.
 */
@Controller('juegos')
@UseGuards(JwtGuardia, RolesGuardia)
@Roles(Rol.SUPERADMIN, Rol.ADMIN_INSTITUCION, Rol.DOCENTE, Rol.ESTUDIANTE)
export class FichasController {
  constructor(private readonly fichasService: FichasService) {}

  @Get(`${CLAVE_MEMORAMA}/partida/:moduloId`)
  partidaMemorama(@UsuarioActual() quien: UsuarioAutenticado, @Param('moduloId') moduloId: string) {
    return this.fichasService.armarPartida(quien, moduloId, CLAVE_MEMORAMA);
  }

  @Get(`${CLAVE_MAHJONG}/partida/:moduloId`)
  partidaMahjong(@UsuarioActual() quien: UsuarioAutenticado, @Param('moduloId') moduloId: string) {
    return this.fichasService.armarPartida(quien, moduloId, CLAVE_MAHJONG);
  }
}
