import { ArgumentsHost, Catch, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Request } from 'express';
import { QueryFailedError } from 'typeorm';
import { ErroresBdFiltro } from './errores-bd.filtro';
import { UsuarioAutenticado } from '../tipos/usuario-autenticado';

/** Rutas de login: en su error se anota el correo con el que se intento (nunca la clave). */
const RUTAS_DE_INGRESO = /\/(autenticacion\/ingresar|scorm\/publico\/[^/]+\/ingresar)$/;

/**
 * Registra en el log cada peticion que termina en error, y despues responde
 * como siempre (los errores de PostgreSQL pasan por ErroresBdFiltro).
 *
 * Una linea por error, para leerla con `pm2 logs ludus-api`:
 *   WARN [Errores] 409 POST /api/usuarios · elena@ludus.io (superadmin) · Ya existe un usuario con ese correo
 *
 * - 4xx (la peticion estaba mal: dato invalido, repetido, sin permiso) -> WARN.
 * - 5xx (fallo del servidor) -> ERROR, con la traza completa.
 */
@Catch()
export class RegistroErroresFiltro extends BaseExceptionFilter {
  private readonly bitacora = new Logger('Errores');
  private readonly erroresBd = new ErroresBdFiltro();

  catch(error: unknown, host: ArgumentsHost): void {
    if (host.getType() === 'http') this.registrar(error, host.switchToHttp().getRequest<Request>());
    if (error instanceof QueryFailedError) {
      this.erroresBd.catch(error, host);
      return;
    }
    super.catch(error, host);
  }

  private registrar(error: unknown, peticion: Request): void {
    const estado = this.estadoDe(error);
    const usuario = peticion.user as UsuarioAutenticado | undefined;
    const quien = usuario ? `${usuario.correo} (${usuario.rol})` : this.correoDeIngreso(peticion) ?? 'sin sesion';
    const linea = `${estado} ${peticion.method} ${peticion.originalUrl} · ${quien} · ${this.mensajeDe(error)}`;
    if (estado >= 500) {
      this.bitacora.error(linea, error instanceof Error ? error.stack : undefined);
    } else {
      this.bitacora.warn(linea);
    }
  }

  private estadoDe(error: unknown): number {
    if (error instanceof HttpException) return error.getStatus();
    if (error instanceof QueryFailedError) {
      const codigo = (error.driverError as { code?: string } | undefined)?.code ?? '';
      if (codigo === '23505') return HttpStatus.CONFLICT;
      if (codigo === '22P02' || codigo === '23503') return HttpStatus.BAD_REQUEST;
    }
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private mensajeDe(error: unknown): string {
    if (error instanceof HttpException) {
      const cuerpo = error.getResponse();
      const mensaje = typeof cuerpo === 'string' ? cuerpo : (cuerpo as { message?: string | string[] }).message;
      return Array.isArray(mensaje) ? mensaje.join('; ') : mensaje ?? error.message;
    }
    if (error instanceof QueryFailedError) {
      const detalle = (error.driverError as { detail?: string } | undefined)?.detail;
      return detalle ? `${error.message} (${detalle})` : error.message;
    }
    return error instanceof Error ? error.message : String(error);
  }

  private correoDeIngreso(peticion: Request): string | null {
    if (!RUTAS_DE_INGRESO.test(peticion.path)) return null;
    const correo = (peticion.body as { correo?: unknown } | undefined)?.correo;
    return typeof correo === 'string' ? `intento con ${correo.slice(0, 160)}` : null;
  }
}
