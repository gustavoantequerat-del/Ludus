import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { JwtGuardia } from '../../comun/guardias/jwt.guardia';
import { RolesGuardia } from '../../comun/guardias/roles.guardia';
import { Roles } from '../../comun/decoradores/roles.decorador';
import { UsuarioActual } from '../../comun/decoradores/usuario-actual.decorador';
import { Rol } from '../../comun/enums/rol.enum';
import { UsuarioAutenticado } from '../../comun/tipos/usuario-autenticado';
import { HistoriasService } from './historias.service';
import { GuardarHistoriaDto } from './dto/historia.dto';
import { CLAVE_RUNNER } from '../catalogo-nuevos';

/* Contenido del Runner Narrativo: historias y sus videos. */
@Controller(`juegos/${CLAVE_RUNNER}`)
@UseGuards(JwtGuardia, RolesGuardia)
@Roles(Rol.SUPERADMIN, Rol.ADMIN_INSTITUCION, Rol.DOCENTE)
export class HistoriasController {
  constructor(private readonly historiasService: HistoriasService) {}

  @Get('videos/limites')
  limites() {
    return this.historiasService.limites();
  }

  /**
   * El video llega crudo en el cuerpo (Content-Type: video/mp4), sin
   * multipart: el navegador manda el archivo tal cual con un solo fetch.
   */
  @Post('videos')
  subirVideo(@Body() contenido: Buffer) {
    return this.historiasService.subirVideo(contenido);
  }

  @Get('historias')
  listar(@UsuarioActual() quien: UsuarioAutenticado) {
    return this.historiasService.listar(quien);
  }

  @Post('historias')
  crear(@UsuarioActual() quien: UsuarioAutenticado, @Body() datos: GuardarHistoriaDto) {
    return this.historiasService.crear(quien, datos);
  }

  @Put('historias/:id')
  actualizar(
    @UsuarioActual() quien: UsuarioAutenticado,
    @Param('id') id: string,
    @Body() datos: GuardarHistoriaDto,
  ) {
    return this.historiasService.actualizar(quien, id, datos);
  }

  @Delete('historias/:id')
  eliminar(@UsuarioActual() quien: UsuarioAutenticado, @Param('id') id: string) {
    return this.historiasService.eliminar(quien, id);
  }
}
