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
import { UsuarioActual } from '../comun/decoradores/usuario-actual.decorador';
import { Rol } from '../comun/enums/rol.enum';
import { UsuarioAutenticado } from '../comun/tipos/usuario-autenticado';
import { PersonajesService } from './personajes.service';
import { CrearPersonajeDto } from './dto/crear-personaje.dto';
import { ActualizarPersonajeDto } from './dto/actualizar-personaje.dto';

const PUEDE_EDITAR = [Rol.SUPERADMIN, Rol.ADMIN_INSTITUCION, Rol.DOCENTE];

@Controller('personajes')
@UseGuards(JwtGuardia, RolesGuardia)
@Roles(...PUEDE_EDITAR)
export class PersonajesController {
  constructor(private readonly personajesService: PersonajesService) {}

  @Get()
  listar(@UsuarioActual() quien: UsuarioAutenticado) {
    return this.personajesService.listar(quien);
  }

  @Get('disponibles')
  disponibles() {
    return this.personajesService.imagenesDisponibles();
  }

  @Post()
  crear(@UsuarioActual() quien: UsuarioAutenticado, @Body() datos: CrearPersonajeDto) {
    return this.personajesService.crear(quien, datos);
  }

  @Patch(':id')
  actualizar(
    @UsuarioActual() quien: UsuarioAutenticado,
    @Param('id') id: string,
    @Body() datos: ActualizarPersonajeDto,
  ) {
    return this.personajesService.actualizar(quien, id, datos);
  }

  @Delete(':id')
  eliminar(@UsuarioActual() quien: UsuarioAutenticado, @Param('id') id: string) {
    return this.personajesService.eliminar(quien, id);
  }
}
