import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { JwtGuardia } from '../comun/guardias/jwt.guardia';
import { RolesGuardia } from '../comun/guardias/roles.guardia';
import { Roles } from '../comun/decoradores/roles.decorador';
import { UsuarioActual } from '../comun/decoradores/usuario-actual.decorador';
import { Rol } from '../comun/enums/rol.enum';
import { UsuarioAutenticado } from '../comun/tipos/usuario-autenticado';
import { InscripcionesService } from './inscripciones.service';
import { AsignarEstudiantesDto } from './dto/asignar-estudiantes.dto';

const PUEDE_ADMINISTRAR = [Rol.SUPERADMIN, Rol.ADMIN_INSTITUCION, Rol.DOCENTE];

@Controller()
@UseGuards(JwtGuardia, RolesGuardia)
@Roles(...PUEDE_ADMINISTRAR)
export class InscripcionesController {
  constructor(private readonly inscripcionesService: InscripcionesService) {}

  @Get('cursos/:cursoId/inscripciones')
  listarDeCurso(
    @UsuarioActual() quien: UsuarioAutenticado,
    @Param('cursoId') cursoId: string,
  ) {
    return this.inscripcionesService.listarDeCurso(quien, cursoId);
  }

  @Put('cursos/:cursoId/inscripciones')
  asignarACurso(
    @UsuarioActual() quien: UsuarioAutenticado,
    @Param('cursoId') cursoId: string,
    @Body() datos: AsignarEstudiantesDto,
  ) {
    return this.inscripcionesService.asignarACurso(quien, cursoId, datos.estudianteIds);
  }

  @Get('rutas/:rutaId/inscripciones')
  listarDeRuta(@UsuarioActual() quien: UsuarioAutenticado, @Param('rutaId') rutaId: string) {
    return this.inscripcionesService.listarDeRuta(quien, rutaId);
  }

  @Put('rutas/:rutaId/inscripciones')
  asignarARuta(
    @UsuarioActual() quien: UsuarioAutenticado,
    @Param('rutaId') rutaId: string,
    @Body() datos: AsignarEstudiantesDto,
  ) {
    return this.inscripcionesService.asignarARuta(quien, rutaId, datos.estudianteIds);
  }
}
