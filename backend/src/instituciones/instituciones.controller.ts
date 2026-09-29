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

@Controller('instituciones')
@UseGuards(JwtGuardia, RolesGuardia)
@Roles(Rol.SUPERADMIN)
export class InstitucionesController {
  constructor(private readonly institucionesService: InstitucionesService) {}

  @Get()
  listar() {
    return this.institucionesService.listar();
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
