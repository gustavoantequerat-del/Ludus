<script setup lang="ts">
import { computed, ref } from 'vue';
import estilos from './ImportarUsuarios.module.css';
import Modal from '@/componentes/base/Modal.vue';
import Boton from '@/componentes/base/Boton.vue';
import Icono from '@/componentes/base/Icono.vue';
import Insignia from '@/componentes/base/Insignia.vue';
import { usuariosServicio } from '@/servicios/usuarios.servicio';
import { mensajeDeError } from '@/utilidades/errores';
import { etiquetaRol } from '@/utilidades/texto';
import type { ResultadoImportacion, Rol } from '@/tipos';

/**
 * Alta masiva desde Excel en dos pasos: el backend revisa el archivo y
 * devuelve los errores por fila; recien al confirmar crea las filas validas.
 */
defineProps<{ conInstitucion: boolean }>();
const emit = defineEmits<{ cerrar: []; importado: [creados: number] }>();

const archivo = ref<File | null>(null);
const revision = ref<ResultadoImportacion | null>(null);
const error = ref('');
const trabajando = ref(false);
const soloErrores = ref(false);

const filasVisibles = computed(() =>
  (revision.value?.filas ?? []).filter((f) => !soloErrores.value || f.errores.length),
);

const etiquetaConfirmar = computed(() => {
  if (trabajando.value) return revision.value ? 'Creando...' : 'Revisando...';
  if (!revision.value) return 'Revisar archivo';
  return `Crear ${revision.value.validas} usuario(s)`;
});

function elegir(evento: Event) {
  const entrada = evento.target as HTMLInputElement;
  archivo.value = entrada.files?.[0] ?? null;
  revision.value = null;
  error.value = '';
}

async function descargarPlantilla() {
  try {
    await usuariosServicio.descargarPlantilla();
  } catch (e) {
    error.value = mensajeDeError(e, 'No se pudo descargar la plantilla');
  }
}

async function confirmar() {
  if (trabajando.value) return;
  error.value = '';
  if (!archivo.value) {
    error.value = 'Elige primero el archivo .xlsx';
    return;
  }
  if (revision.value && !revision.value.validas) {
    error.value = 'Ninguna fila es valida. Corrige el archivo y vuelve a elegirlo.';
    return;
  }
  trabajando.value = true;
  try {
    const resultado = await usuariosServicio.importar(archivo.value, !!revision.value);
    if (revision.value) {
      emit('importado', resultado.creados ?? 0);
      return;
    }
    revision.value = resultado;
    soloErrores.value = resultado.conErrores > 0;
  } catch (e) {
    error.value = mensajeDeError(e, 'No se pudo leer el archivo');
  } finally {
    trabajando.value = false;
  }
}

function textoRol(rol: string) {
  return etiquetaRol(rol as Rol) || rol;
}
</script>

<template>
  <Modal
    titulo="Importar usuarios desde Excel"
    descripcion="Sube un .xlsx con el formato de la plantilla. Antes de crear nada veras una vista previa."
    icono="file-spreadsheet"
    ancho
    :etiqueta-confirmar="etiquetaConfirmar"
    @cerrar="emit('cerrar')"
    @confirmar="confirmar"
  >
    <div :class="estilos.paso">
      <span :class="estilos.numero">1</span>
      <div :class="estilos.textoPaso">
        <strong>Descarga la plantilla</strong>
        <span>
          Columnas: nombre, correo, clave, rol<template v-if="conInstitucion">, institucion</template>.
          La hoja "Instrucciones" explica cada una.
        </span>
      </div>
      <Boton icono="download" @click="descargarPlantilla">Plantilla .xlsx</Boton>
    </div>

    <div :class="estilos.paso">
      <span :class="estilos.numero">2</span>
      <div :class="estilos.textoPaso">
        <strong>Elige el archivo lleno</strong>
        <span>{{ archivo ? archivo.name : 'Ningun archivo elegido' }}</span>
      </div>
      <label :class="estilos.elegir">
        <Icono nombre="upload" :tamano="15" />
        Elegir
        <input
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          :class="estilos.oculto"
          @change="elegir"
        />
      </label>
    </div>

    <p v-if="error" :class="estilos.error">{{ error }}</p>

    <template v-if="revision">
      <div :class="estilos.resumen">
        <Insignia tono="ok">{{ revision.validas }} lista(s)</Insignia>
        <Insignia v-if="revision.conErrores" tono="error">{{ revision.conErrores }} con errores (se omiten)</Insignia>
        <label v-if="revision.conErrores" :class="estilos.filtro">
          <input v-model="soloErrores" type="checkbox" /> Ver solo errores
        </label>
      </div>
      <div :class="estilos.tabla">
        <div v-for="f in filasVisibles" :key="f.fila" :class="[estilos.fila, f.errores.length ? estilos.filaError : '']">
          <span :class="estilos.celdaFila">{{ f.fila }}</span>
          <div :class="estilos.celdaDatos">
            <span :class="estilos.nombre">{{ f.nombre || '(sin nombre)' }}</span>
            <span :class="estilos.detalle">
              {{ f.correo || '(sin correo)' }} · {{ textoRol(f.rol) }}<template v-if="f.institucion"> · {{ f.institucion }}</template>
            </span>
            <span v-for="(e, i) in f.errores" :key="i" :class="estilos.motivo">{{ e }}</span>
          </div>
          <Icono :nombre="f.errores.length ? 'circle-x' : 'circle-check'" :tamano="16" />
        </div>
      </div>
    </template>
  </Modal>
</template>
