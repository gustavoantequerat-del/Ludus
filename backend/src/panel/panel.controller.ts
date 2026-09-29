import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtGuardia } from '../comun/guardias/jwt.guardia';
import { RolesGuardia } from '../comun/guardias/roles.guardia';
import { Roles } from '../comun/decoradores/roles.decorador';
import { UsuarioActual } from '../comun/decoradores/usuario-actual.decorador';
import { Rol } from '../comun/enums/rol.enum';
import { UsuarioAutenticado } from '../comun/tipos/usuario-autenticado';
import { PanelService } from './panel.service';

@Controller('panel')
@UseGuards(JwtGuardia)
export class PanelController {
  constructor(private readonly panelService: PanelService) {}

  @Get('resumen')
  resumen(@UsuarioActual() quien: UsuarioAutenticado) {
    return this.panelService.resumen(quien);
  }

  @Get('actividad')
  @UseGuards(RolesGuardia)
  @Roles(Rol.SUPERADMIN)
  actividad() {
    return this.panelService.actividadReciente();
  }
}
