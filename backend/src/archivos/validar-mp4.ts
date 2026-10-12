/**
 * Lee la estructura de un MP4 (sus "cajas") para saber cuanto dura y con que
 * codec esta el video, sin instalar ffmpeg en el servidor.
 *
 * Un MP4 es una lista de cajas [tamano][tipo][contenido]; algunas contienen
 * otras. La duracion esta en moov > mvhd y el codec en
 * moov > trak > mdia > minf > stbl > stsd, en la pista cuyo hdlr dice "vide".
 */

export interface DatosVideo {
  duracionSegundos: number;
  codec: string;
}

interface Caja {
  tipo: string;
  inicio: number;
  fin: number;
}

function cajas(datos: Buffer, desde: number, hasta: number): Caja[] {
  const lista: Caja[] = [];
  let posicion = desde;
  while (posicion + 8 <= hasta) {
    let tamano = datos.readUInt32BE(posicion);
    const tipo = datos.toString('latin1', posicion + 4, posicion + 8);
    let cabecera = 8;
    if (tamano === 1) {
      if (posicion + 16 > hasta) break;
      tamano = Number(datos.readBigUInt64BE(posicion + 8));
      cabecera = 16;
    } else if (tamano === 0) {
      tamano = hasta - posicion;
    }
    if (tamano < cabecera || posicion + tamano > hasta) break;
    lista.push({ tipo, inicio: posicion + cabecera, fin: posicion + tamano });
    posicion += tamano;
  }
  return lista;
}

function hija(datos: Buffer, padre: Caja, tipo: string): Caja | undefined {
  return cajas(datos, padre.inicio, padre.fin).find((caja) => caja.tipo === tipo);
}

function duracion(datos: Buffer, mvhd: Caja): number {
  const version = datos.readUInt8(mvhd.inicio);
  if (version === 1) {
    const escala = datos.readUInt32BE(mvhd.inicio + 20);
    const unidades = Number(datos.readBigUInt64BE(mvhd.inicio + 24));
    return escala ? unidades / escala : 0;
  }
  const escala = datos.readUInt32BE(mvhd.inicio + 12);
  const unidades = datos.readUInt32BE(mvhd.inicio + 16);
  return escala ? unidades / escala : 0;
}

function codecDeVideo(datos: Buffer, moov: Caja): string | null {
  for (const trak of cajas(datos, moov.inicio, moov.fin).filter((caja) => caja.tipo === 'trak')) {
    const mdia = hija(datos, trak, 'mdia');
    const hdlr = mdia && hija(datos, mdia, 'hdlr');
    if (!mdia || !hdlr || datos.toString('latin1', hdlr.inicio + 8, hdlr.inicio + 12) !== 'vide') {
      continue;
    }
    const minf = hija(datos, mdia, 'minf');
    const stbl = minf && hija(datos, minf, 'stbl');
    const stsd = stbl && hija(datos, stbl, 'stsd');
    if (!stsd || stsd.inicio + 16 > stsd.fin) continue;
    // stsd: version y flags (4), cantidad de entradas (4), y la primera
    // entrada empieza con su tamano (4) y su tipo, que es el codec.
    return datos.toString('latin1', stsd.inicio + 12, stsd.inicio + 16);
  }
  return null;
}

/** null si el archivo no es un MP4 legible. */
export function leerMp4(datos: Buffer): (DatosVideo & { marca: string }) | null {
  const raiz = cajas(datos, 0, datos.length);
  const ftyp = raiz[0]?.tipo === 'ftyp' ? raiz[0] : undefined;
  const moov = raiz.find((caja) => caja.tipo === 'moov');
  if (!ftyp || !moov) return null;

  const mvhd = hija(datos, moov, 'mvhd');
  if (!mvhd) return null;

  return {
    marca: datos.toString('latin1', ftyp.inicio, ftyp.inicio + 4),
    duracionSegundos: duracion(datos, mvhd),
    codec: codecDeVideo(datos, moov) ?? '',
  };
}
