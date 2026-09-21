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
import { CursosService } from './cursos.service';
import { CrearCursoDto } from './dto/crear-curso.dto';
import { ActualizarCursoDto } from './dto/actualizar-curso.dto';
import { CrearModuloDto } from './dto/crear-modulo.dto';
import { ActualizarModuloDto } from './dto/actualizar-modulo.dto';
import { MoverModuloDto } from './dto/mover-modulo.dto';

const TODOS_LOS_ROLES = [
  Rol.SUPERADMIN,
  Rol.ADMIN_INSTITUCION,
  Rol.DOCENTE,
  Rol.ESTUDIANTE,
];
const PUEDE_ESCRIBIR = [Rol.SUPERADMIN, Rol.ADMIN_INSTITUCION, Rol.DOCENTE];

@Controller('cursos')
@UseGuards(JwtGuardia, RolesGuardia)
export class CursosController {
  constructor(private readonly cursosService: CursosService) {}

  @Get()
  @Roles(...TODOS_LOS_ROLES)
  listar(@UsuarioActual() quien: UsuarioAutenticado) {
    return this.cursosService.listar(quien);
  }

  @Get('explorar')
  @Roles(Rol.ESTUDIANTE)
  explorar(@UsuarioActual() quien: UsuarioAutenticado) {
    return this.cursosService.explorar(quien);
  }

  @Get(':id')
  @Roles(...TODOS_LOS_ROLES)
  obtener(@UsuarioActual() quien: UsuarioAutenticado, @Param('id') id: string) {
    return this.cursosService.obtener(quien, id);
  }

  @Post()
  @Roles(...PUEDE_ESCRIBIR)
  crear(@UsuarioActual() quien: UsuarioAutenticado, @Body() datos: CrearCursoDto) {
    return this.cursosService.crear(quien, datos);
  }

  @Patch(':id')
  @Roles(...PUEDE_ESCRIBIR)
  actualizar(
    @UsuarioActual() quien: UsuarioAutenticado,
    @Param('id') id: string,
    @Body() datos: ActualizarCursoDto,
  ) {
    return this.cursosService.actualizar(quien, id, datos);
  }

  @Delete(':id')
  @Roles(...PUEDE_ESCRIBIR)
  eliminar(@UsuarioActual() quien: UsuarioAutenticado, @Param('id') id: string) {
    return this.cursosService.eliminar(quien, id);
  }

  @Post(':id/modulos')
  @Roles(...PUEDE_ESCRIBIR)
  crearModulo(
    @UsuarioActual() quien: UsuarioAutenticado,
    @Param('id') id: string,
    @Body() datos: CrearModuloDto,
  ) {
    return this.cursosService.crearModulo(quien, id, datos);
  }

  @Patch(':id/modulos/:moduloId')
  @Roles(...PUEDE_ESCRIBIR)
  actualizarModulo(
    @UsuarioActual() quien: UsuarioAutenticado,
    @Param('id') id: string,
    @Param('moduloId') moduloId: string,
    @Body() datos: ActualizarModuloDto,
  ) {
    return this.cursosService.actualizarModulo(quien, id, moduloId, datos);
  }

  @Delete(':id/modulos/:moduloId')
  @Roles(...PUEDE_ESCRIBIR)
  eliminarModulo(
    @UsuarioActual() quien: UsuarioAutenticado,
    @Param('id') id: string,
    @Param('moduloId') moduloId: string,
  ) {
    return this.cursosService.eliminarModulo(quien, id, moduloId);
  }

  @Patch(':id/modulos/:moduloId/mover')
  @Roles(...PUEDE_ESCRIBIR)
  moverModulo(
    @UsuarioActual() quien: UsuarioAutenticado,
    @Param('id') id: string,
    @Param('moduloId') moduloId: string,
    @Body() datos: MoverModuloDto,
  ) {
    return this.cursosService.moverModulo(quien, id, moduloId, datos.direccion);
  }
}
