import { ref } from 'vue';

type Tema = 'claro' | 'oscuro';

const LLAVE_TEMA = 'ludus-theme';

const tema = ref<Tema>('oscuro');

function aplicarTema(nuevoTema: Tema) {
  tema.value = nuevoTema;
  document.documentElement.setAttribute('data-theme', nuevoTema === 'claro' ? 'light' : 'dark');
  try {
    localStorage.setItem(LLAVE_TEMA, nuevoTema === 'claro' ? 'light' : 'dark');
  } catch {
    /* almacenamiento no disponible: se ignora */
  }
}

function inicializarTema() {
  let guardado: string | null = null;
  try {
    guardado = localStorage.getItem(LLAVE_TEMA);
  } catch {
    /* almacenamiento no disponible: se ignora */
  }
  aplicarTema(guardado === 'light' ? 'claro' : 'oscuro');
}

function alternarTema() {
  aplicarTema(tema.value === 'claro' ? 'oscuro' : 'claro');
}

export function usarTema() {
  return { tema, inicializarTema, alternarTema };
}
