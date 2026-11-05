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
import { JwtGuardia } from '../comun/guardias/jwt.guardia';
import { RolesGuardia } from '../comun/guardias/roles.guardia';
import { Roles } from '../comun/decoradores/roles.decorador';
import { Rol } from '../comun/enums/rol.enum';
import { InstitucionesService } from './instituciones.service';
import { CrearInstitucionDto } from './dto/crear-institucion.dto';
import { ActualizarInstitucionDto } from './dto/actualizar-institucion.dto';
import { UsuarioActual } from '../comun/decoradores/usuario-actual.decorador';
import { UsuarioAutenticado } from '../comun/tipos/usuario-autenticado';

@Controller('instituciones')
@UseGuards(JwtGuardia, RolesGuardia)
@Roles(Rol.SUPERADMIN)
export class InstitucionesController {
  constructor(private readonly institucionesService: InstitucionesService) {}

  @Get()
  listar() {
    return this.institucionesService.listar();
  }

  /** Codigo para que los estudiantes nuevos se registren en la institucion. */
  @Get(':id/codigo-registro')
  @Roles(Rol.SUPERADMIN, Rol.ADMIN_INSTITUCION)
  codigoRegistro(@UsuarioActual() quien: UsuarioAutenticado, @Param('id') id: string) {
    return this.institucionesService.codigoRegistro(quien, id);
  }

  @Post(':id/codigo-registro')
  @Roles(Rol.SUPERADMIN, Rol.ADMIN_INSTITUCION)
  renovarCodigo(@UsuarioActual() quien: UsuarioAutenticado, @Param('id') id: string) {
    return this.institucionesService.renovarCodigo(quien, id);
  }

  @Get(':id')
  obtener(@Param('id') id: string) {
    return this.institucionesService.obtener(id);
  }

  @Post()
  crear(@Body() datos: CrearInstitucionDto) {
    return this.institucionesService.crear(datos);
  }

  @Patch(':id')
  actualizar(@Param('id') id: string, @Body() datos: ActualizarInstitucionDto) {
    return this.institucionesService.actualizar(id, datos);
  }

  @Delete(':id')
  eliminar(@Param('id') id: string) {
    return this.institucionesService.eliminar(id);
  }
}
