import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { JwtGuardia } from '../../comun/guardias/jwt.guardia';
import { RolesGuardia } from '../../comun/guardias/roles.guardia';
import { Roles } from '../../comun/decoradores/roles.decorador';
import { UsuarioActual } from '../../comun/decoradores/usuario-actual.decorador';
import { Rol } from '../../comun/enums/rol.enum';
import { UsuarioAutenticado } from '../../comun/tipos/usuario-autenticado';
import { BancosAjedrezService } from './bancos-ajedrez.service';
import { GuardarBancoAjedrezDto } from './dto/banco-ajedrez.dto';
import { CLAVE_AJEDREZ } from '../catalogo-nuevos';

/* Contenido del Ajedrez de Preguntas: bancos de preguntas con sus reglas. */
@Controller(`juegos/${CLAVE_AJEDREZ}/bancos`)
@UseGuards(JwtGuardia, RolesGuardia)
@Roles(Rol.SUPERADMIN, Rol.ADMIN_INSTITUCION, Rol.DOCENTE)
export class BancosAjedrezController {
  constructor(private readonly bancosService: BancosAjedrezService) {}

  @Get()
  listar(@UsuarioActual() quien: UsuarioAutenticado) {
    return this.bancosService.listar(quien);
  }

  @Post()
  crear(@UsuarioActual() quien: UsuarioAutenticado, @Body() datos: GuardarBancoAjedrezDto) {
    return this.bancosService.crear(quien, datos);
  }

  @Put(':id')
  actualizar(
    @UsuarioActual() quien: UsuarioAutenticado,
    @Param('id') id: string,
    @Body() datos: GuardarBancoAjedrezDto,
  ) {
    return this.bancosService.actualizar(quien, id, datos);
  }

  @Delete(':id')
  eliminar(@UsuarioActual() quien: UsuarioAutenticado, @Param('id') id: string) {
    return this.bancosService.eliminar(quien, id);
  }
}
