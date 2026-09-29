import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CLAVE_ROLES } from '../decoradores/roles.decorador';
import { Rol } from '../enums/rol.enum';

@Injectable()
export class RolesGuardia implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(contexto: ExecutionContext): boolean {
    const rolesRequeridos = this.reflector.getAllAndOverride<Rol[]>(CLAVE_ROLES, [
      contexto.getHandler(),
      contexto.getClass(),
    ]);
    if (!rolesRequeridos || rolesRequeridos.length === 0) return true;

    const { user } = contexto.switchToHttp().getRequest();
    return !!user && rolesRequeridos.includes(user.rol);
  }
}
