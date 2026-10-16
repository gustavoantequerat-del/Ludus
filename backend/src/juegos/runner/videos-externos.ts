/**
 * Videos del Runner Narrativo alojados afuera: YouTube o Google Drive.
 *
 * Ludus no guarda video: el docente pega el link y aqui se reconoce, se
 * reduce al id del video y se guarda en una forma canonica. Al jugar, el
 * navegador recibe { fuente, id } y arma el reproductor de cada servicio.
 */

export type FuenteVideo = 'youtube' | 'drive';

export interface VideoExterno {
  fuente: FuenteVideo;
  id: string;
}

const ID_YOUTUBE = /^[A-Za-z0-9_-]{11}$/;
const ID_DRIVE = /^[A-Za-z0-9_-]{20,}$/;
const DOMINIOS_YOUTUBE = ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com'];

function comoUrl(texto: string): URL | null {
  const limpio = texto.trim();
  if (!limpio) return null;
  try {
    return new URL(/^https?:\/\//i.test(limpio) ? limpio : `https://${limpio}`);
  } catch {
    return null;
  }
}

function deYoutube(url: URL): string | null {
  const host = url.hostname.toLowerCase();
  if (host === 'youtu.be') return url.pathname.split('/')[1] || null;
  if (!DOMINIOS_YOUTUBE.includes(host)) return null;
  if (url.pathname === '/watch') return url.searchParams.get('v');
  // /shorts/ID, /embed/ID, /live/ID, /v/ID
  const [, tipo, id] = url.pathname.split('/');
  return ['shorts', 'embed', 'live', 'v'].includes(tipo) ? id || null : null;
}

function deDrive(url: URL): string | null {
  const host = url.hostname.toLowerCase();
  if (host !== 'drive.google.com' && host !== 'docs.google.com') return null;
  // /file/d/ID/view, /file/d/ID/preview, /file/u/0/d/ID/view
  const enRuta = /\/d\/([^/]+)/.exec(url.pathname);
  if (enRuta) return enRuta[1];
  // /open?id=ID, /uc?id=ID
  return url.searchParams.get('id');
}

/** El video de un link de YouTube o de Drive; null si no es ninguno de los dos. */
export function leerLinkVideo(link: string | null | undefined): VideoExterno | null {
  if (!link) return null;
  const url = comoUrl(link);
  if (!url) return null;

  const youtube = deYoutube(url);
  if (youtube && ID_YOUTUBE.test(youtube)) return { fuente: 'youtube', id: youtube };
  const drive = deDrive(url);
  if (drive && ID_DRIVE.test(drive)) return { fuente: 'drive', id: drive };
  return null;
}

/** Forma en que se guarda: un link normal que el docente puede abrir. */
export function linkCanonico(video: VideoExterno): string {
  return video.fuente === 'youtube'
    ? `https://www.youtube.com/watch?v=${video.id}`
    : `https://drive.google.com/file/d/${video.id}/view`;
}
