<script setup lang="ts">
/**
 * Elegir el docente de un curso: solo docentes activos de la institucion del
 * curso (el servidor lo vuelve a comprobar). Lo usan el formulario de la
 * lista de cursos y el del detalle.
 */
import { computed, onMounted, ref } from 'vue';
import estilos from './CampoDocente.module.css';
import CampoSelector from '@/componentes/base/CampoSelector.vue';
import { usuariosServicio } from '@/servicios/usuarios.servicio';
import type { Usuario } from '@/tipos';

const props = defineProps<{ modelValue: string | null | undefined; institucionId: string | null | undefined }>();
const emit = defineEmits<{ 'update:modelValue': [docenteId: string | null] }>();

const SIN_DOCENTE = 'ninguno';
const docentes = ref<Usuario[]>([]);
const cargando = ref(true);

const deLaInstitucion = computed(() =>
  docentes.value.filter((d) => d.activo && d.institucionId === props.institucionId),
);
const opciones = computed(() => [
  { valor: SIN_DOCENTE, texto: 'Sin docente' },
  ...deLaInstitucion.value.map((d) => ({ valor: d.id, texto: d.nombre })),
]);

onMounted(async () => {
  docentes.value = await usuariosServicio.listar('docente');
  cargando.value = false;
});
</script>

<template>
  <div :class="estilos.campo">
    <CampoSelector
      :model-value="modelValue ?? SIN_DOCENTE"
      etiqueta="Docente"
      :opciones="opciones"
      @update:model-value="(v) => emit('update:modelValue', v === SIN_DOCENTE ? null : v)"
    />
    <p v-if="!cargando && deLaInstitucion.length === 0" :class="estilos.aviso">
      Esta institucion todavia no tiene docentes activos. Crealos en Usuarios (o en Docentes) y vuelve aqui.
    </p>
  </div>
</template>
