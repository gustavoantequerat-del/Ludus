import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UsuarioAutenticado } from '../tipos/usuario-autenticado';

export const UsuarioActual = createParamDecorator(
  (_dato: unknown, contexto: ExecutionContext): UsuarioAutenticado => {
    const solicitud = contexto.switchToHttp().getRequest();
    return solicitud.user;
  },
);
