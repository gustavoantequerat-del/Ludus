import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { mkdir, readdir, unlink, writeFile } from 'fs/promises';
import { join } from 'path';
import { ConfiguracionApp } from '../configuracion/configuracion';
import { BASE_PUBLICA_ARCHIVOS } from './archivos.constantes';

/**
 * Guarda en disco las imagenes que sube el docente.
 *
 * Llegan como data URL dentro del JSON (no multipart) para no sumar una
 * dependencia de subida: el navegador ya sabe leer un archivo a base64 y el
 * volumen es chico, una foto por personaje.
 */

const TIPOS_PERMITIDOS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

/** Tope por imagen ya decodificada. */
const MAXIMO_BYTES = 3 * 1024 * 1024;

const PATRON_DATA_URL = /^data:([a-z/+-]+);base64,([A-Za-z0-9+/=\s]+)$/;

@Injectable()
export class ArchivosService {
  private readonly raiz: string;

  constructor(config: ConfigService<ConfiguracionApp, true>) {
    this.raiz = config.get('rutaArchivos', { infer: true });
  }

  /**
   * Escribe la imagen y devuelve su ruta publica (/archivos/...), que es lo
   * que se guarda en la base y consume el navegador.
   */
  async guardarImagen(carpeta: string, dataUrl: string): Promise<string> {
    const coincidencia = PATRON_DATA_URL.exec(dataUrl.trim());
    if (!coincidencia) {
      throw new BadRequestException('La imagen no tiene un formato valido');
    }

    const [, tipo, base64] = coincidencia;
    const extension = TIPOS_PERMITIDOS[tipo];
    if (!extension) {
      throw new BadRequestException('Solo se aceptan imagenes PNG, JPG o WEBP');
    }

    const contenido = Buffer.from(base64, 'base64');
    if (contenido.length === 0) {
      throw new BadRequestException('La imagen esta vacia');
    }
    if (contenido.length > MAXIMO_BYTES) {
      throw new BadRequestException('La imagen supera los 3 MB');
    }

    const nombre = `${randomBytes(8).toString('hex')}.${extension}`;
    await mkdir(join(this.raiz, carpeta), { recursive: true });
    await writeFile(join(this.raiz, carpeta, nombre), contenido);
    return `${BASE_PUBLICA_ARCHIVOS}/${carpeta}/${nombre}`;
  }

  /**
   * Imagenes que estan en la carpeta pero todavia no son un registro.
   *
   * Es el camino para los assets que alguien deja a mano en el servidor: no
   * hace falta subirlos otra vez desde la aplicacion, aparecen solos para que
   * el docente les ponga nombre.
   */
  async listarImagenes(carpeta: string): Promise<string[]> {
    const entradas = await readdir(join(this.raiz, carpeta)).catch(() => [] as string[]);
    return entradas
      .filter((nombre) => /\.(png|jpe?g|webp)$/i.test(nombre))
      .sort()
      .map((nombre) => `${BASE_PUBLICA_ARCHIVOS}/${carpeta}/${nombre}`);
  }

  /**
   * Borra una imagen subida. Solo actua sobre rutas propias: una imagen que el
   * usuario dejo a mano en la carpeta tambien vive ahi, y borrarla no rompe
   * nada, pero cualquier ruta de afuera se ignora.
   */
  async eliminarImagen(rutaPublica: string | null): Promise<void> {
    if (!rutaPublica || !rutaPublica.startsWith(`${BASE_PUBLICA_ARCHIVOS}/`)) return;

    const relativa = rutaPublica.slice(BASE_PUBLICA_ARCHIVOS.length + 1);
    if (relativa.includes('..')) return;

    await unlink(join(this.raiz, relativa)).catch(() => undefined);
  }
}
