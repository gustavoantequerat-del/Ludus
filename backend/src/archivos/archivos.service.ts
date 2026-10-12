import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { mkdir, readdir, stat, unlink, writeFile } from 'fs/promises';
import { join } from 'path';
import { ConfiguracionApp } from '../configuracion/configuracion';
import { BASE_PUBLICA_ARCHIVOS, CARPETA_VIDEOS } from './archivos.constantes';
import { leerMp4 } from './validar-mp4';

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

/**
 * Limites de los videos del Runner Narrativo. Diez segundos en 720p caben de
 * sobra en 10 MB; lo que pase de eso es casi siempre un video de celular sin
 * comprimir, que el estudiante tendria que descargar entero en cada partida.
 */
export const LIMITES_VIDEO = {
  maximoSegundos: 10,
  maximoBytes: 10 * 1024 * 1024,
  /** Margen para el redondeo de los editores: un "10 s" suele medir 10,03. */
  toleranciaSegundos: 0.25,
};

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
   * Guarda un video del Runner Narrativo. Solo MP4 con video H.264, que es lo
   * unico que reproducen todos los navegadores (el HEVC de los iPhone, por
   * ejemplo, no se ve en Chrome ni en Firefox de Windows).
   */
  async guardarVideo(contenido: Buffer): Promise<string> {
    const megas = LIMITES_VIDEO.maximoBytes / (1024 * 1024);
    if (!Buffer.isBuffer(contenido) || contenido.length === 0) {
      throw new BadRequestException('No llego ningun video. Sube un archivo MP4.');
    }
    if (contenido.length > LIMITES_VIDEO.maximoBytes) {
      throw new BadRequestException(`El video pesa mas de ${megas} MB. Exportalo en 720p para que pese menos.`);
    }

    const video = leerMp4(contenido);
    if (!video) {
      throw new BadRequestException('El archivo no es un MP4 valido.');
    }
    if (video.marca === 'qt  ') {
      throw new BadRequestException('Es un video .mov de QuickTime. Exportalo como MP4 (H.264).');
    }
    if (video.codec === 'hvc1' || video.codec === 'hev1') {
      throw new BadRequestException(
        'El video esta en HEVC (H.265), que muchos navegadores no reproducen. Exportalo en H.264.',
      );
    }
    if (video.codec !== 'avc1' && video.codec !== 'avc3') {
      throw new BadRequestException('El video tiene que estar en H.264 (el MP4 mas comun).');
    }
    if (video.duracionSegundos <= 0) {
      throw new BadRequestException('No se pudo leer la duracion del video. Vuelve a exportarlo como MP4.');
    }
    if (video.duracionSegundos > LIMITES_VIDEO.maximoSegundos + LIMITES_VIDEO.toleranciaSegundos) {
      throw new BadRequestException(
        `El video dura ${video.duracionSegundos.toFixed(1)} s; el maximo es ${LIMITES_VIDEO.maximoSegundos} s.`,
      );
    }

    const nombre = `${randomBytes(8).toString('hex')}.mp4`;
    await mkdir(join(this.raiz, CARPETA_VIDEOS), { recursive: true });
    await writeFile(join(this.raiz, CARPETA_VIDEOS, nombre), contenido);
    return `${BASE_PUBLICA_ARCHIVOS}/${CARPETA_VIDEOS}/${nombre}`;
  }

  /**
   * Si una ruta que manda el cliente es un archivo propio dentro de una de las
   * carpetas permitidas. Evita guardar referencias a archivos que no existen o
   * que estan fuera de lo que se sirve.
   */
  async existe(rutaPublica: string, carpetas: string[]): Promise<boolean> {
    const dentro = carpetas.some((carpeta) =>
      rutaPublica.startsWith(`${BASE_PUBLICA_ARCHIVOS}/${carpeta}/`),
    );
    if (!dentro || rutaPublica.includes('..')) return false;

    const relativa = rutaPublica.slice(BASE_PUBLICA_ARCHIVOS.length + 1);
    return stat(join(this.raiz, relativa))
      .then((datos) => datos.isFile())
      .catch(() => false);
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
