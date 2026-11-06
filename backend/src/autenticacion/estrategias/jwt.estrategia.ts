import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfiguracionApp } from '../../configuracion/configuracion';
import { UsuarioAutenticado } from '../../comun/tipos/usuario-autenticado';
import { UsuariosService } from '../../usuarios/usuarios.service';

interface CargaJwt {
  sub: string;
  correo: string;
  nombre: string;
  rol: UsuarioAutenticado['rol'];
  institucionId: string | null;
}

@Injectable()
export class JwtEstrategia extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService<ConfiguracionApp, true>,
    private readonly usuarios: UsuariosService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('jwt.secreto', { infer: true }),
    });
  }

  /**
   * Cada pedido se valida contra la base (una consulta por id): si al usuario
   * lo desactivaron, le cambiaron el rol o la institucion, o desactivaron su
   * institucion, vale desde ese momento y no cuando venza el token.
   */
  async validate(carga: CargaJwt): Promise<UsuarioAutenticado> {
    const usuario = await this.usuarios.paraSesion(carga.sub);
    if (!usuario || !usuario.activo) {
      throw new UnauthorizedException('Tu cuenta no esta activa. Habla con el admin de tu institucion.');
    }
    if (usuario.institucion && !usuario.institucion.activa) {
      throw new UnauthorizedException('Tu institucion esta desactivada en Ludus.');
    }
    return {
      id: usuario.id,
      correo: usuario.correo,
      nombre: usuario.nombre,
      rol: usuario.rol,
      institucionId: usuario.institucionId,
    };
  }
}
