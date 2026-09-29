import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsuariosService } from '../usuarios/usuarios.service';
import { Usuario } from '../usuarios/usuario.entidad';
import { IngresarDto } from './dto/ingresar.dto';
import { ActualizarPerfilDto } from './dto/actualizar-perfil.dto';
import { CambiarClaveDto } from './dto/cambiar-clave.dto';

@Injectable()
export class AutenticacionService {
  constructor(
    private readonly usuariosService: UsuariosService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * El token lleva nombre y correo, asi que al editar el perfil hay que
   * reemitirlo para que la sesion no quede con datos viejos.
   */
  async actualizarPerfil(id: string, datos: ActualizarPerfilDto) {
    const usuario = await this.usuariosService.actualizarPerfil(id, datos);
    return this.construirSesion(usuario);
  }

  async cambiarClave(id: string, datos: CambiarClaveDto): Promise<void> {
    await this.usuariosService.cambiarClave(id, datos.claveActual, datos.claveNueva);
  }

  async ingresar(datos: IngresarDto) {
    const usuario = await this.usuariosService.buscarPorCorreoConClave(datos.correo);
    if (!usuario || !usuario.activo) {
      throw new UnauthorizedException('Correo o contrasena invalidos');
    }

    const claveValida = await bcrypt.compare(datos.clave, usuario.claveHash);
    if (!claveValida) {
      throw new UnauthorizedException('Correo o contrasena invalidos');
    }

    return this.construirSesion(usuario);
  }

  private construirSesion(usuario: Usuario) {
    const carga = {
      sub: usuario.id,
      correo: usuario.correo,
      nombre: usuario.nombre,
      rol: usuario.rol,
      institucionId: usuario.institucionId,
    };

    return {
      tokenAcceso: this.jwtService.sign(carga),
      usuario: carga,
    };
  }
}
