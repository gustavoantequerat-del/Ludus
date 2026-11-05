/**
 * Limite simple de intentos fallidos por IP, en memoria (se reinicia con el
 * servidor). Sirve para que el codigo de registro no se pueda adivinar
 * probando: con 31^8 combinaciones y 10 intentos cada 15 minutos, no hay forma.
 */
export class LimiteIntentos {
  private readonly fallos = new Map<string, { cuenta: number; desde: number }>();

  constructor(
    private readonly maximo: number,
    private readonly ventanaMs: number,
  ) {}

  bloqueado(clave: string | null): boolean {
    if (!clave) return false;
    const registro = this.fallos.get(clave);
    if (!registro) return false;
    if (Date.now() - registro.desde > this.ventanaMs) {
      this.fallos.delete(clave);
      return false;
    }
    return registro.cuenta >= this.maximo;
  }

  fallo(clave: string | null) {
    if (!clave) return;
    const ahora = Date.now();
    const registro = this.fallos.get(clave);
    if (!registro || ahora - registro.desde > this.ventanaMs) this.fallos.set(clave, { cuenta: 1, desde: ahora });
    else registro.cuenta++;
    // Sin crecer para siempre: se limpian las ventanas vencidas de vez en cuando.
    if (this.fallos.size > 5000) {
      for (const [k, v] of this.fallos) if (ahora - v.desde > this.ventanaMs) this.fallos.delete(k);
    }
  }
}
