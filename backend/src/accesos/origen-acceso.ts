import { Request } from 'express';
import { MetodoAcceso } from './acceso.entidad';

export interface OrigenAcceso {
  metodo: MetodoAcceso;
  ip: string | null;
  agente: string | null;
}

/**
 * De donde viene el inicio de sesion. Detras de Caddy (o de cualquier proxy)
 * la IP real llega en X-Forwarded-For; sin proxy se usa la del socket.
 */
export function origenDePeticion(peticion: Request, metodo: MetodoAcceso): OrigenAcceso {
  const reenviada = String(peticion.headers['x-forwarded-for'] ?? '').split(',')[0].trim();
  const agente = String(peticion.headers['user-agent'] ?? '');
  return {
    metodo,
    ip: (reenviada || peticion.socket?.remoteAddress || '').slice(0, 64) || null,
    agente: agente.slice(0, 300) || null,
  };
}
