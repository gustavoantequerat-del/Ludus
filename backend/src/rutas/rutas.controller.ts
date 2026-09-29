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
import { RutasService } from './rutas.service';
import { CrearRutaDto } from './dto/crear-ruta.dto';
import { ActualizarRutaDto } from './dto/actualizar-ruta.dto';
import { AgregarCursoRutaDto } from './dto/agregar-curso-ruta.dto';

const TODOS_LOS_ROLES = [
  Rol.SUPERADMIN,
  Rol.ADMIN_INSTITUCION,
  Rol.DOCENTE,
  Rol.ESTUDIANTE,
];
const PUEDE_ESCRIBIR = [Rol.SUPERADMIN, Rol.ADMIN_INSTITUCION, Rol.DOCENTE];

@Controller('rutas')
@UseGuards(JwtGuardia, RolesGuardia)
export class RutasController {
  constructor(private readonly rutasService: RutasService) {}

  @Get()
  @Roles(...TODOS_LOS_ROLES)
  listar(@UsuarioActual() quien: UsuarioAutenticado) {
    return this.rutasService.listar(quien);
  }

  @Get(':id')
  @Roles(...TODOS_LOS_ROLES)
  obtener(@UsuarioActual() quien: UsuarioAutenticado, @Param('id') id: string) {
    return this.rutasService.obtener(quien, id);
  }

  @Post()
  @Roles(...PUEDE_ESCRIBIR)
  crear(@UsuarioActual() quien: UsuarioAutenticado, @Body() datos: CrearRutaDto) {
    return this.rutasService.crear(quien, datos);
  }

  @Patch(':id')
  @Roles(...PUEDE_ESCRIBIR)
  actualizar(
    @UsuarioActual() quien: UsuarioAutenticado,
    @Param('id') id: string,
    @Body() datos: ActualizarRutaDto,
  ) {
    return this.rutasService.actualizar(quien, id, datos);
  }

  @Delete(':id')
  @Roles(...PUEDE_ESCRIBIR)
  eliminar(@UsuarioActual() quien: UsuarioAutenticado, @Param('id') id: string) {
    return this.rutasService.eliminar(quien, id);
  }

  @Post(':id/cursos')
  @Roles(...PUEDE_ESCRIBIR)
  agregarCurso(
    @UsuarioActual() quien: UsuarioAutenticado,
    @Param('id') id: string,
    @Body() datos: AgregarCursoRutaDto,
  ) {
    return this.rutasService.agregarCurso(quien, id, datos.cursoId);
  }

  @Delete(':id/cursos/:cursoId')
  @Roles(...PUEDE_ESCRIBIR)
  quitarCurso(
    @UsuarioActual() quien: UsuarioAutenticado,
    @Param('id') id: string,
    @Param('cursoId') cursoId: string,
  ) {
    return this.rutasService.quitarCurso(quien, id, cursoId);
  }
}
