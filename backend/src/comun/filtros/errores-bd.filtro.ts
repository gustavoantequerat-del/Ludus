import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';
import { QueryFailedError } from 'typeorm';

/** Errores de PostgreSQL que son culpa del cliente, con la respuesta que les corresponde. */
const ERRORES_DEL_CLIENTE: Record<string, { estado: number; error: string; mensaje: string }> = {
  // Un id que no es un UUID.
  '22P02': { estado: HttpStatus.BAD_REQUEST, error: 'Bad Request', mensaje: 'Identificador invalido' },
  // Un valor unico repetido (el dominio de una institucion, por ejemplo).
  '23505': { estado: HttpStatus.CONFLICT, error: 'Conflict', mensaje: 'Ya existe un registro con esos datos' },
  // Una referencia a algo que no existe o que esta en uso.
  '23503': {
    estado: HttpStatus.BAD_REQUEST,
    error: 'Bad Request',
    mensaje: 'Hace referencia a un registro que no existe o que esta en uso',
  },
};

@Catch(QueryFailedError)
export class ErroresBdFiltro implements ExceptionFilter {
  private readonly logger = new Logger('BaseDeDatos');

  catch(falla: QueryFailedError, host: ArgumentsHost): void {
    const respuesta = host.switchToHttp().getResponse<Response>();
    const codigo = (falla.driverError as { code?: string } | undefined)?.code ?? '';
    const conocido = ERRORES_DEL_CLIENTE[codigo];

    if (conocido) {
      respuesta
        .status(conocido.estado)
        .json({ message: conocido.mensaje, error: conocido.error, statusCode: conocido.estado });
      return;
    }

    this.logger.error(falla.message, falla.stack);
    respuesta
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Internal server error' });
  }
}
