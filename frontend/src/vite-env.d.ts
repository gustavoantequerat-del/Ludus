/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const componente: DefineComponent<{}, {}, any>;
  export default componente;
}

declare module '*.module.css' {
  const clases: Record<string, string>;
  export default clases;
}

interface ImportMetaEnv {
  readonly VITE_URL_API: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
