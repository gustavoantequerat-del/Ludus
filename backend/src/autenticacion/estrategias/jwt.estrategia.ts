import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfiguracionApp } from '../../configuracion/configuracion';
import { UsuarioAutenticado } from '../../comun/tipos/usuario-autenticado';

interface CargaJwt {
  sub: string;
  correo: string;
  nombre: string;
  rol: UsuarioAutenticado['rol'];
  institucionId: string | null;
}

@Injectable()
export class JwtEstrategia extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService<ConfiguracionApp, true>) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('jwt.secreto', { infer: true }),
    });
  }

  validate(carga: CargaJwt): UsuarioAutenticado {
    return {
      id: carga.sub,
      correo: carga.correo,
      nombre: carga.nombre,
      rol: carga.rol,
      institucionId: carga.institucionId,
    };
  }
}
