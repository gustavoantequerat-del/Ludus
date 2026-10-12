import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtGuardia } from '../../comun/guardias/jwt.guardia';
import { RolesGuardia } from '../../comun/guardias/roles.guardia';
import { Roles } from '../../comun/decoradores/roles.decorador';
import { UsuarioActual } from '../../comun/decoradores/usuario-actual.decorador';
import { Rol } from '../../comun/enums/rol.enum';
import { UsuarioAutenticado } from '../../comun/tipos/usuario-autenticado';
import { RunnerService } from './runner.service';
import { RespuestaRunnerDto, TerminarRunnerDto } from './dto/historia.dto';
import { CLAVE_RUNNER } from '../catalogo-nuevos';

@Controller(`juegos/${CLAVE_RUNNER}/partida`)
@UseGuards(JwtGuardia, RolesGuardia)
@Roles(Rol.SUPERADMIN, Rol.ADMIN_INSTITUCION, Rol.DOCENTE, Rol.ESTUDIANTE)
export class RunnerController {
  constructor(private readonly runnerService: RunnerService) {}

  @Get(':moduloId')
  armarPartida(@UsuarioActual() quien: UsuarioAutenticado, @Param('moduloId') moduloId: string) {
    return this.runnerService.armarPartida(quien, moduloId);
  }

  @Post(':moduloId/verificar')
  verificar(
    @UsuarioActual() quien: UsuarioAutenticado,
    @Param('moduloId') moduloId: string,
    @Body() respuesta: RespuestaRunnerDto,
  ) {
    return this.runnerService.verificar(quien, moduloId, respuesta);
  }

  @Post(':moduloId/terminar')
  @Roles(Rol.ESTUDIANTE)
  terminar(
    @UsuarioActual() quien: UsuarioAutenticado,
    @Param('moduloId') moduloId: string,
    @Body() datos: TerminarRunnerDto,
  ) {
    return this.runnerService.terminar(quien, moduloId, datos.respuestas);
  }
}
