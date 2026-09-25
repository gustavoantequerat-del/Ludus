import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtGuardia } from '../comun/guardias/jwt.guardia';
import { RolesGuardia } from '../comun/guardias/roles.guardia';
import { Roles } from '../comun/decoradores/roles.decorador';
import { UsuarioActual } from '../comun/decoradores/usuario-actual.decorador';
import { Rol } from '../comun/enums/rol.enum';
import { UsuarioAutenticado } from '../comun/tipos/usuario-autenticado';
import { ScormService } from './scorm.service';
import { CrearPaqueteDto } from './dto/crear-paquete.dto';
import { ActualizarPaqueteDto } from './dto/actualizar-paquete.dto';
import { RegistrarResultadoScormDto } from './dto/registrar-resultado-scorm.dto';
import { IngresarDto } from '../autenticacion/dto/ingresar.dto';
import { TerminarPartidaDto, VerificarCasoDto } from '../juegos/dto/partida.dto';

const PUEDE_EXPORTAR = [Rol.SUPERADMIN, Rol.ADMIN_INSTITUCION, Rol.DOCENTE];

@Controller('scorm')
export class ScormController {
  constructor(private readonly scormService: ScormService) {}

  /* --- Paquetes: los administra quien puede editar el curso --- */

  @Get('paquetes')
  @UseGuards(JwtGuardia, RolesGuardia)
  @Roles(...PUEDE_EXPORTAR)
  listar(@UsuarioActual() quien: UsuarioAutenticado) {
    return this.scormService.listar(quien);
  }

  @Post('paquetes')
  @UseGuards(JwtGuardia, RolesGuardia)
  @Roles(...PUEDE_EXPORTAR)
  crear(@UsuarioActual() quien: UsuarioAutenticado, @Body() datos: CrearPaqueteDto) {
    return this.scormService.crear(quien, datos.moduloId);
  }

  @Get('paquetes/:id/descargar')
  @UseGuards(JwtGuardia, RolesGuardia)
  @Roles(...PUEDE_EXPORTAR)
  async descargar(
    @UsuarioActual() quien: UsuarioAutenticado,
    @Param('id') id: string,
    @Res() respuesta: Response,
  ) {
    const { nombreArchivo, contenido } = await this.scormService.generarZip(quien, id);
    respuesta.setHeader('Content-Type', 'application/zip');
    respuesta.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
    respuesta.send(contenido);
  }

  @Patch('paquetes/:id')
  @UseGuards(JwtGuardia, RolesGuardia)
  @Roles(...PUEDE_EXPORTAR)
  cambiarEstado(
    @UsuarioActual() quien: UsuarioAutenticado,
    @Param('id') id: string,
    @Body() datos: ActualizarPaqueteDto,
  ) {
    return this.scormService.cambiarEstado(quien, id, datos.activo);
  }

  @Delete('paquetes/:id')
  @UseGuards(JwtGuardia, RolesGuardia)
  @Roles(...PUEDE_EXPORTAR)
  eliminar(@UsuarioActual() quien: UsuarioAutenticado, @Param('id') id: string) {
    return this.scormService.eliminar(quien, id);
  }

  /* --- Ejecucion dentro del LMS: el paquete llama a estas rutas --- */

  @Get('publico/:token')
  informacionPublica(@Param('token') token: string) {
    return this.scormService.informacionPublica(token);
  }

  @Post('publico/:token/ingresar')
  ingresar(@Param('token') token: string, @Body() datos: IngresarDto) {
    return this.scormService.ingresar(token, datos);
  }

  @Get('publico/:token/partida')
  @UseGuards(JwtGuardia)
  armarPartida(@Param('token') token: string, @UsuarioActual() quien: UsuarioAutenticado) {
    return this.scormService.armarPartida(token, quien);
  }

  @Post('publico/:token/verificar')
  @UseGuards(JwtGuardia)
  verificarCaso(@Body() datos: VerificarCasoDto) {
    return this.scormService.verificarCaso(datos.casoId, datos.decision);
  }

  @Post('publico/:token/partida')
  @UseGuards(JwtGuardia)
  terminarPartida(
    @Param('token') token: string,
    @UsuarioActual() quien: UsuarioAutenticado,
    @Body() datos: TerminarPartidaDto,
  ) {
    return this.scormService.terminarPartida(token, quien, datos.respuestas);
  }

  @Post('publico/:token/resultado')
  @UseGuards(JwtGuardia)
  registrarResultado(
    @Param('token') token: string,
    @UsuarioActual() quien: UsuarioAutenticado,
    @Body() datos: RegistrarResultadoScormDto,
  ) {
    return this.scormService.registrarResultado(token, quien, datos);
  }
}
