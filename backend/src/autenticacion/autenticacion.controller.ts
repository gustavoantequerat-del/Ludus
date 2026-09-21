import { Body, Controller, Get, HttpCode, Patch, Post, UseGuards } from '@nestjs/common';
import { AutenticacionService } from './autenticacion.service';
import { IngresarDto } from './dto/ingresar.dto';
import { ActualizarPerfilDto } from './dto/actualizar-perfil.dto';
import { CambiarClaveDto } from './dto/cambiar-clave.dto';
import { JwtGuardia } from '../comun/guardias/jwt.guardia';
import { UsuarioActual } from '../comun/decoradores/usuario-actual.decorador';
import { UsuarioAutenticado } from '../comun/tipos/usuario-autenticado';

@Controller('autenticacion')
export class AutenticacionController {
  constructor(private readonly autenticacionService: AutenticacionService) {}

  @Post('ingresar')
  ingresar(@Body() datos: IngresarDto) {
    return this.autenticacionService.ingresar(datos);
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
