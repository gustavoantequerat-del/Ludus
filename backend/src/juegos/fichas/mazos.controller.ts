import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtGuardia } from '../../comun/guardias/jwt.guardia';
import { RolesGuardia } from '../../comun/guardias/roles.guardia';
import { Roles } from '../../comun/decoradores/roles.decorador';
import { UsuarioActual } from '../../comun/decoradores/usuario-actual.decorador';
import { Rol } from '../../comun/enums/rol.enum';
import { UsuarioAutenticado } from '../../comun/tipos/usuario-autenticado';
import { MazosService } from './mazos.service';
import { ActualizarMazoDto, CrearMazoDto, SubirImagenMazoDto } from './dto/mazo.dto';

/* Mazos del Memorama y del Mahjong (?juego=memorama | mahjong). */
@Controller('juegos/mazos')
@UseGuards(JwtGuardia, RolesGuardia)
@Roles(Rol.SUPERADMIN, Rol.ADMIN_INSTITUCION, Rol.DOCENTE)
export class MazosController {
  constructor(private readonly mazosService: MazosService) {}

  @Get()
  listar(@UsuarioActual() quien: UsuarioAutenticado, @Query('juego') juego?: string) {
    return this.mazosService.listar(quien, juego);
  }

  @Post('imagenes')
  subirImagen(@Body() datos: SubirImagenMazoDto) {
    return this.mazosService.subirImagen(datos);
  }

  @Post()
  crear(@UsuarioActual() quien: UsuarioAutenticado, @Body() datos: CrearMazoDto) {
    return this.mazosService.crear(quien, datos);
  }

  @Post(':id/duplicar')
  duplicar(@UsuarioActual() quien: UsuarioAutenticado, @Param('id') id: string) {
    return this.mazosService.duplicar(quien, id);
  }

  @Patch(':id')
  actualizar(
    @UsuarioActual() quien: UsuarioAutenticado,
    @Param('id') id: string,
    @Body() datos: ActualizarMazoDto,
  ) {
    return this.mazosService.actualizar(quien, id, datos);
  }

  @Delete(':id')
  eliminar(@UsuarioActual() quien: UsuarioAutenticado, @Param('id') id: string) {
    return this.mazosService.eliminar(quien, id);
  }
}
