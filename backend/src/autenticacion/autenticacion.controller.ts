import { Body, Controller, Get, HttpCode, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AutenticacionService } from './autenticacion.service';
import { IngresarDto } from './dto/ingresar.dto';
import { IngresarGoogleDto } from './dto/ingresar-google.dto';
import { origenDePeticion } from '../accesos/origen-acceso';
import { ActualizarPerfilDto } from './dto/actualizar-perfil.dto';
import { CambiarClaveDto } from './dto/cambiar-clave.dto';
import { JwtGuardia } from '../comun/guardias/jwt.guardia';
import { UsuarioActual } from '../comun/decoradores/usuario-actual.decorador';
import { UsuarioAutenticado } from '../comun/tipos/usuario-autenticado';

@Controller('autenticacion')
export class AutenticacionController {
  constructor(private readonly autenticacionService: AutenticacionService) {}

  @Post('ingresar')
  ingresar(@Body() datos: IngresarDto, @Req() peticion: Request) {
    return this.autenticacionService.ingresar(datos, origenDePeticion(peticion, 'clave'));
  }

  @Post('google')
  ingresarConGoogle(@Body() datos: IngresarGoogleDto, @Req() peticion: Request) {
    return this.autenticacionService.ingresarConGoogle(
      datos.credencial,
      origenDePeticion(peticion, 'google'),
    );
  }

  /** Publico: ids de Google (login y Analytics) que el frontend necesita sin sesion. */
  @Get('opciones')
  opciones() {
    return this.autenticacionService.opciones();
  }

  @Get('perfil')
  @UseGuards(JwtGuardia)
  perfil(@UsuarioActual() usuario: UsuarioAutenticado) {
    return usuario;
  }

  @Patch('perfil')
  @UseGuards(JwtGuardia)
  actualizarPerfil(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() datos: ActualizarPerfilDto,
  ) {
    return this.autenticacionService.actualizarPerfil(usuario.id, datos);
  }

  @Patch('clave')
  @HttpCode(204)
  @UseGuards(JwtGuardia)
  cambiarClave(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() datos: CambiarClaveDto,
  ) {
    return this.autenticacionService.cambiarClave(usuario.id, datos);
  }
}
