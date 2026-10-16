import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtGuardia } from '../comun/guardias/jwt.guardia';
import { RolesGuardia } from '../comun/guardias/roles.guardia';
import { Roles } from '../comun/decoradores/roles.decorador';
import { UsuarioActual } from '../comun/decoradores/usuario-actual.decorador';
import { Rol } from '../comun/enums/rol.enum';
import { UsuarioAutenticado } from '../comun/tipos/usuario-autenticado';
import { AccesosService } from './accesos.service';
import { FiltroAccesosDto } from './dto/filtro-accesos.dto';

@Controller('accesos')
@UseGuards(JwtGuardia, RolesGuardia)
export class AccesosController {
  constructor(private readonly accesosService: AccesosService) {}

  @Get()
  @Roles(Rol.SUPERADMIN, Rol.ADMIN_INSTITUCION)
  listar(@UsuarioActual() quien: UsuarioAutenticado, @Query() filtro: FiltroAccesosDto) {
    return this.accesosService.listar(quien, filtro);
  }
}
