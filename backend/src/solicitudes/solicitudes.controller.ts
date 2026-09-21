import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtGuardia } from '../comun/guardias/jwt.guardia';
import { RolesGuardia } from '../comun/guardias/roles.guardia';
import { Roles } from '../comun/decoradores/roles.decorador';
import { UsuarioActual } from '../comun/decoradores/usuario-actual.decorador';
import { Rol } from '../comun/enums/rol.enum';
import { UsuarioAutenticado } from '../comun/tipos/usuario-autenticado';
import { SolicitudesService } from './solicitudes.service';
import { CrearSolicitudDto } from './dto/crear-solicitud.dto';
import { ResolverSolicitudDto } from './dto/resolver-solicitud.dto';

@Controller('solicitudes')
@UseGuards(JwtGuardia, RolesGuardia)
export class SolicitudesController {
  constructor(private readonly solicitudesService: SolicitudesService) {}

  @Get()
  @Roles(Rol.SUPERADMIN, Rol.ADMIN_INSTITUCION, Rol.ESTUDIANTE)
  listar(@UsuarioActual() quien: UsuarioAutenticado) {
    return this.solicitudesService.listar(quien);
  }

  @Post()
  @Roles(Rol.ESTUDIANTE)
  crear(@UsuarioActual() quien: UsuarioAutenticado, @Body() datos: CrearSolicitudDto) {
    return this.solicitudesService.crear(quien, datos);
  }

  @Patch(':id')
  @Roles(Rol.SUPERADMIN, Rol.ADMIN_INSTITUCION)
  resolver(
    @UsuarioActual() quien: UsuarioAutenticado,
    @Param('id') id: string,
    @Body() datos: ResolverSolicitudDto,
  ) {
    return this.solicitudesService.resolver(quien, id, datos.estado);
  }
}
