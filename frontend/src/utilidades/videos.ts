/**
 * Videos del Runner Narrativo alojados en YouTube o Google Drive.
 *
 * El reconocimiento del link es el mismo que hace el backend
 * (juegos/runner/videos-externos.ts); aqui sirve para avisar al docente
 * mientras escribe. Quien decide al guardar es el servidor.
 */
import type { VideoExterno } from '@/tipos';

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
  const [, tipo, id] = url.pathname.split('/');
  return ['shorts', 'embed', 'live', 'v'].includes(tipo) ? id || null : null;
}

function deDrive(url: URL): string | null {
  const host = url.hostname.toLowerCase();
  if (host !== 'drive.google.com' && host !== 'docs.google.com') return null;
  const enRuta = /\/d\/([^/]+)/.exec(url.pathname);
  if (enRuta) return enRuta[1];
  return url.searchParams.get('id');
}

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

/** URL para un iframe simple (vista previa del editor y respaldo del juego). */
export function urlInsercion(video: VideoExterno): string {
  return video.fuente === 'youtube'
    ? `https://www.youtube-nocookie.com/embed/${video.id}?rel=0&playsinline=1`
    : `https://drive.google.com/file/d/${video.id}/preview`;
}

/* --- API de YouTube: la unica que avisa cuando el video termina --- */

interface ReproductorYoutube {
  playVideo(): void;
  destroy(): void;
}

interface ApiYoutube {
  Player: new (
    elemento: HTMLElement,
    opciones: {
      videoId: string;
      host?: string;
      playerVars?: Record<string, number | string>;
      events?: {
        onReady?: (evento: { target: ReproductorYoutube }) => void;
        onStateChange?: (evento: { data: number }) => void;
        onError?: () => void;
      };
    },
  ) => ReproductorYoutube;
  PlayerState: { ENDED: number };
}

declare global {
  interface Window {
    YT?: ApiYoutube;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let cargaYoutube: Promise<ApiYoutube> | null = null;

export function cargarApiYoutube(): Promise<ApiYoutube> {
  cargaYoutube ??= new Promise<ApiYoutube>((resolver, rechazar) => {
    if (window.YT?.Player) {
      resolver(window.YT);
      return;
    }
    const previo = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previo?.();
      if (window.YT) resolver(window.YT);
    };
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.onerror = () => {
      cargaYoutube = null;
      rechazar(new Error('No se pudo cargar YouTube'));
    };
    document.head.appendChild(script);
    setTimeout(() => rechazar(new Error('YouTube no respondio')), 8000);
  });
  return cargaYoutube;
}

export type { ReproductorYoutube };
