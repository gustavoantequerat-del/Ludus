import { ref } from 'vue';

const mensaje = ref<string | null>(null);
let temporizador: ReturnType<typeof setTimeout> | null = null;

/** Los errores quedan mas tiempo en pantalla: suelen traer algo que leer. */
function notificar(texto: string, duracionMs = 2600) {
  mensaje.value = texto;
  if (temporizador) clearTimeout(temporizador);
  temporizador = setTimeout(() => {
    mensaje.value = null;
  }, duracionMs);
}

export function usarNotificaciones() {
  return { mensaje, notificar };
}
