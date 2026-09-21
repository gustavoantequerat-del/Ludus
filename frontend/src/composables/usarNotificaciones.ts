import { ref } from 'vue';

const mensaje = ref<string | null>(null);
let temporizador: ReturnType<typeof setTimeout> | null = null;

function notificar(texto: string) {
  mensaje.value = texto;
  if (temporizador) clearTimeout(temporizador);
  temporizador = setTimeout(() => {
    mensaje.value = null;
  }, 2600);
}

export function usarNotificaciones() {
  return { mensaje, notificar };
}
