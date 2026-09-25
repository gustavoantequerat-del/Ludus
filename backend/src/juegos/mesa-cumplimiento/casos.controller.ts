import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtGuardia } from '../../comun/guardias/jwt.guardia';
import { RolesGuardia } from '../../comun/guardias/roles.guardia';
import { Roles } from '../../comun/decoradores/roles.decorador';
import { UsuarioActual } from '../../comun/decoradores/usuario-actual.decorador';
import { Rol } from '../../comun/enums/rol.enum';
import { UsuarioAutenticado } from '../../comun/tipos/usuario-autenticado';
import { CasosService } from './casos.service';
import { CrearCasoDto } from './dto/crear-caso.dto';
import { ActualizarCasoDto } from './dto/actualizar-caso.dto';

const PUEDE_EDITAR = [Rol.SUPERADMIN, Rol.ADMIN_INSTITUCION, Rol.DOCENTE];

/*
 * Bajo la ruta del juego: estos casos son el contenido de la Mesa de
 * Cumplimiento, no un recurso suelto del sistema. Otro juego jugable tendra
 * su propio editor y sus propias tablas.
 */
@Controller('juegos/mesa-cumplimiento/casos')
@UseGuards(JwtGuardia, RolesGuardia)
@Roles(...PUEDE_EDITAR)
export class CasosController {
  constructor(private readonly casosService: CasosService) {}

  @Get()
  listar(@UsuarioActual() quien: UsuarioAutenticado) {
    return this.casosService.listar(quien);
  }

  @Post()
  crear(@UsuarioActual() quien: UsuarioAutenticado, @Body() datos: CrearCasoDto) {
    return this.casosService.crear(quien, datos);
  }

  @Post('duplicar-base')
  duplicarBase(@UsuarioActual() quien: UsuarioAutenticado) {
    return this.casosService.duplicarBase(quien);
  }

  @Patch(':id')
  actualizar(
    @UsuarioActual() quien: UsuarioAutenticado,
    @Param('id') id: string,
    @Body() datos: ActualizarCasoDto,
  ) {
    return this.casosService.actualizar(quien, id, datos);
  }

  @Delete(':id')
  eliminar(@UsuarioActual() quien: UsuarioAutenticado, @Param('id') id: string) {
    return this.casosService.eliminar(quien, id);
  }
}
