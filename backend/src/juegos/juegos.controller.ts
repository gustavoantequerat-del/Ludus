import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { JwtGuardia } from '../comun/guardias/jwt.guardia';
import { RolesGuardia } from '../comun/guardias/roles.guardia';
import { Roles } from '../comun/decoradores/roles.decorador';
import { UsuarioActual } from '../comun/decoradores/usuario-actual.decorador';
import { Rol } from '../comun/enums/rol.enum';
import { UsuarioAutenticado } from '../comun/tipos/usuario-autenticado';
import { JuegosService } from './juegos.service';
import { ConfigurarJuegoDto } from './dto/configurar-juego.dto';

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
