import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtGuardia extends AuthGuard('jwt') {
  /** Mismo comportamiento que passport, con un mensaje claro en vez de "Unauthorized". */
  handleRequest<T>(error: unknown, usuario: T): T {
    if (error || !usuario) {
      throw new UnauthorizedException('Tu sesion vencio o no iniciaste sesion. Vuelve a ingresar.');
    }
    return usuario;
  }
}
