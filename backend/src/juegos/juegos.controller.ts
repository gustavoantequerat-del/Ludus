import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { JwtGuardia } from '../comun/guardias/jwt.guardia';
import { RolesGuardia } from '../comun/guardias/roles.guardia';
import { Roles } from '../comun/decoradores/roles.decorador';
import { UsuarioActual } from '../comun/decoradores/usuario-actual.decorador';
import { Rol } from '../comun/enums/rol.enum';
import { UsuarioAutenticado } from '../comun/tipos/usuario-autenticado';
import { JuegosService } from './juegos.service';
import { ConfigurarJuegoDto } from './dto/configurar-juego.dto';
import { TerminarPartidaDto, VerificarCasoDto } from './dto/partida.dto';

const TODOS_LOS_ROLES = [
  Rol.SUPERADMIN,
  Rol.ADMIN_INSTITUCION,
  Rol.DOCENTE,
  Rol.ESTUDIANTE,
];

@Controller('juegos')
@UseGuards(JwtGuardia, RolesGuardia)
@Roles(...TODOS_LOS_ROLES)
export class JuegosController {
  constructor(private readonly juegosService: JuegosService) {}

  @Get()
  listarCatalogo() {
    return this.juegosService.listarCatalogo();
  }

  /* --- Partida de un juego con mecanica real --- */

  @Get('partida/:moduloId')
  armarPartida(
    @UsuarioActual() quien: UsuarioAutenticado,
    @Param('moduloId') moduloId: string,
  ) {
    return this.juegosService.armarPartida(quien, moduloId);
  }

  @Post('partida/verificar')
  verificarCaso(@Body() datos: VerificarCasoDto) {
    return this.juegosService.verificarCaso(datos.casoId, datos.decision);
  }

  @Post('partida/:moduloId/terminar')
  @Roles(Rol.ESTUDIANTE)
  terminarPartida(
    @UsuarioActual() quien: UsuarioAutenticado,
    @Param('moduloId') moduloId: string,
    @Body() datos: TerminarPartidaDto,
  ) {
    return this.juegosService.terminarPartida(quien, moduloId, datos.respuestas);
  }

  @Get('modulos/:moduloId/configuracion')
  obtenerConfiguracion(
    @UsuarioActual() quien: UsuarioAutenticado,
    @Param('moduloId') moduloId: string,
  ) {
    return this.juegosService.obtenerConfiguracion(quien, moduloId);
  }

  @Put('modulos/:moduloId/configuracion')
  @Roles(Rol.SUPERADMIN, Rol.ADMIN_INSTITUCION, Rol.DOCENTE)
  configurar(
    @UsuarioActual() quien: UsuarioAutenticado,
    @Param('moduloId') moduloId: string,
    @Body() datos: ConfigurarJuegoDto,
  ) {
    return this.juegosService.configurar(quien, moduloId, datos);
  }
}
