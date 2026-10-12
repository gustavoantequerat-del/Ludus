<script setup lang="ts">
/**
 * Parametros propios del Memorama y del Mahjong: que mazo usan y, segun el
 * juego, rondas, pares y velocidad de volteo, o tamano del tablero.
 */
import { computed, onMounted, ref, watch } from 'vue';
import estilos from './Ajustes.module.css';
import CampoRango from '@/componentes/base/CampoRango.vue';
import CampoSelector from '@/componentes/base/CampoSelector.vue';
import { mazosServicio } from '@/servicios/mazos.servicio';
import { urlArchivo } from '@/utilidades/archivos';
import type { ClaveJuegoFichas, Mazo, Velocidad } from '@/tipos';

const props = defineProps<{
  juegoClave: ClaveJuegoFichas;
  ajustes: Record<string, unknown>;
  paresContenido: number;
  velocidad: Velocidad;
}>();
const emit = defineEmits<{
  'update:ajustes': [valor: Record<string, unknown>];
  'update:paresContenido': [valor: number];
  'update:velocidad': [valor: Velocidad];
}>();

const PARES = { minimo: 4, maximo: 12 };

const mazos = ref<Mazo[]>([]);
const mazoElegido = computed(
  () => mazos.value.find((m) => m.id === props.ajustes.mazoId) ?? mazos.value[0] ?? null,
);
const maximoPares = computed(() =>
  Math.max(PARES.minimo, Math.min(PARES.maximo, mazoElegido.value?.iconos.length ?? PARES.maximo)),
);

function cambiar(clave: string, valor: unknown) {
  emit('update:ajustes', { ...props.ajustes, [clave]: valor });
}

// Al cambiar de mazo, los pares no pueden pasar de sus iconos.
watch(maximoPares, (maximo) => {
  if (props.juegoClave === 'memorama' && props.paresContenido > maximo) {
    emit('update:paresContenido', maximo);
  }
});

onMounted(async () => {
  mazos.value = await mazosServicio.listar(props.juegoClave);
  const base = { ...props.ajustes };
  if (!mazos.value.some((m) => m.id === base.mazoId)) base.mazoId = mazos.value[0]?.id;
  if (props.juegoClave === 'memorama') base.rondas ??= 1;
  if (props.juegoClave === 'mahjong') base.tamano ??= 'mediano';
  emit('update:ajustes', base);
  if (props.juegoClave === 'memorama') {
    emit('update:paresContenido', Math.min(Math.max(props.paresContenido, PARES.minimo), maximoPares.value));
  }
});
</script>

<template>
  <div :class="estilos.campo">
    <span :class="estilos.etiqueta">Mazo</span>
    <div :class="estilos.opciones">
      <button
        v-for="mazo in mazos"
        :key="mazo.id"
        type="button"
        :class="[estilos.opcion, mazoElegido?.id === mazo.id ? estilos.opcionActiva : '']"
        @click="cambiar('mazoId', mazo.id)"
      >
        <span :class="estilos.miniaturas">
          <img v-for="icono in mazo.iconos.slice(0, 4)" :key="icono" :class="estilos.miniatura" :src="urlArchivo(icono)" alt="" />
        </span>
        <span :class="estilos.opcionTextos">
          <span :class="estilos.opcionNombre">{{ mazo.nombre }}</span>
          <span :class="estilos.opcionDetalle">
            {{ mazo.iconos.length }} iconos{{ mazo.institucionId === null ? ' · base de Ludus' : '' }}
          </span>
        </span>
      </button>
    </div>
    <span :class="estilos.ayuda">Los mazos se crean y editan en Editor &gt; {{ juegoClave === 'memorama' ? 'Memorama' : 'Mahjong' }}.</span>
  </div>

  <template v-if="juegoClave === 'memorama'">
    <CampoRango
      :model-value="(ajustes.rondas as number) ?? 1"
      etiqueta="Rondas"
      :min="1"
      :max="5"
      @update:model-value="cambiar('rondas', $event)"
    />
    <CampoRango
      :model-value="paresContenido"
      etiqueta="Pares por ronda"
      :min="PARES.minimo"
      :max="maximoPares"
      @update:model-value="emit('update:paresContenido', $event)"
    />
    <CampoSelector
      :model-value="velocidad"
      etiqueta="Velocidad de volteo"
      :opciones="[
        { valor: 'baja', texto: 'Lenta' },
        { valor: 'media', texto: 'Normal' },
        { valor: 'alta', texto: 'Rapida' },
      ]"
      @update:model-value="emit('update:velocidad', $event as Velocidad)"
    />
    <span :class="estilos.ayuda">
      Cuanto quedan a la vista dos fichas que no son pareja antes de voltearse: lenta 1,6 s, normal
      1 s, rapida 0,55 s.
    </span>
  </template>

  <CampoSelector
    v-else
    :model-value="(ajustes.tamano as string) ?? 'mediano'"
    etiqueta="Tamano del tablero"
    :opciones="[
      { valor: 'pequeno', texto: 'Pequeno (36 fichas)' },
      { valor: 'mediano', texto: 'Mediano (80)' },
      { valor: 'grande', texto: 'Grande (108)' },
    ]"
    @update:model-value="cambiar('tamano', $event)"
  />
</template>
