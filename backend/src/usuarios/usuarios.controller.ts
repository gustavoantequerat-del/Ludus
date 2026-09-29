import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtGuardia } from '../comun/guardias/jwt.guardia';
import { RolesGuardia } from '../comun/guardias/roles.guardia';
import { Roles } from '../comun/decoradores/roles.decorador';
import { UsuarioActual } from '../comun/decoradores/usuario-actual.decorador';
import { Rol } from '../comun/enums/rol.enum';
import { UsuarioAutenticado } from '../comun/tipos/usuario-autenticado';
import { UsuariosService } from './usuarios.service';
import { CrearUsuarioDto } from './dto/crear-usuario.dto';
import { ActualizarUsuarioDto } from './dto/actualizar-usuario.dto';
import { FiltroUsuariosDto } from './dto/filtro-usuarios.dto';

@Controller('usuarios')
@UseGuards(JwtGuardia, RolesGuardia)
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Get()
  @Roles(Rol.SUPERADMIN, Rol.ADMIN_INSTITUCION, Rol.DOCENTE)
  listar(@UsuarioActual() quien: UsuarioAutenticado, @Query() filtro: FiltroUsuariosDto) {
    return this.usuariosService.listar(quien, filtro);
  }

  @Get(':id')
  @Roles(Rol.SUPERADMIN, Rol.ADMIN_INSTITUCION, Rol.DOCENTE)
  obtener(@UsuarioActual() quien: UsuarioAutenticado, @Param('id') id: string) {
    return this.usuariosService.obtener(quien, id);
  }

  @Post()
  @Roles(Rol.SUPERADMIN, Rol.ADMIN_INSTITUCION)
  crear(@UsuarioActual() quien: UsuarioAutenticado, @Body() datos: CrearUsuarioDto) {
    return this.usuariosService.crear(quien, datos);
  }

  @Patch(':id')
  @Roles(Rol.SUPERADMIN, Rol.ADMIN_INSTITUCION)
  actualizar(
    @UsuarioActual() quien: UsuarioAutenticado,
    @Param('id') id: string,
    @Body() datos: ActualizarUsuarioDto,
  ) {
    return this.usuariosService.actualizar(quien, id, datos);
  }

  @Delete(':id')
  @Roles(Rol.SUPERADMIN, Rol.ADMIN_INSTITUCION)
  eliminar(@UsuarioActual() quien: UsuarioAutenticado, @Param('id') id: string) {
    return this.usuariosService.eliminar(quien, id);
  }
}
