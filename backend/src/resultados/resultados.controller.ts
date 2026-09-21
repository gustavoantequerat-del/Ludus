import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtGuardia } from '../comun/guardias/jwt.guardia';
import { RolesGuardia } from '../comun/guardias/roles.guardia';
import { Roles } from '../comun/decoradores/roles.decorador';
import { UsuarioActual } from '../comun/decoradores/usuario-actual.decorador';
import { Rol } from '../comun/enums/rol.enum';
import { UsuarioAutenticado } from '../comun/tipos/usuario-autenticado';
import { ResultadosService } from './resultados.service';
import { CrearResultadoDto } from './dto/crear-resultado.dto';

@Controller('resultados')
@UseGuards(JwtGuardia, RolesGuardia)
export class ResultadosController {
  constructor(private readonly resultadosService: ResultadosService) {}

  @Get()
  @Roles(Rol.SUPERADMIN, Rol.ADMIN_INSTITUCION, Rol.DOCENTE, Rol.ESTUDIANTE)
  listar(@UsuarioActual() quien: UsuarioAutenticado) {
    return this.resultadosService.listar(quien);
  }

  @Post()
  @Roles(Rol.ESTUDIANTE)
  crear(@UsuarioActual() quien: UsuarioAutenticado, @Body() datos: CrearResultadoDto) {
    return this.resultadosService.crear(quien, datos);
  }
}
