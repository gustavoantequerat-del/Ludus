<script setup lang="ts">
/**
 * Pagina publica de Ludus: que es, que juegos trae y el registro de
 * estudiantes nuevos con el codigo de su institucion. Un enlace del tipo
 * /bienvenida?codigo=ABCD-EFGH llega con el codigo ya escrito.
 */
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import estilos from './LandingVista.module.css';
import Icono from '@/componentes/base/Icono.vue';
import Boton from '@/componentes/base/Boton.vue';
import CampoTexto from '@/componentes/base/CampoTexto.vue';
import { useAlmacenAutenticacion } from '@/almacenes/autenticacion';
import { usarNotificaciones } from '@/composables/usarNotificaciones';
import { mensajeDeError } from '@/utilidades/errores';

const almacen = useAlmacenAutenticacion();
const ruta = useRoute();
const enrutador = useRouter();
const { notificar } = usarNotificaciones();

const nombre = ref('');
const correo = ref('');
const clave = ref('');
const codigo = ref(typeof ruta.query.codigo === 'string' ? ruta.query.codigo : '');
const cargando = ref(false);
const error = ref('');
const formulario = ref<HTMLElement | null>(null);

const JUEGOS = [
  { icono: 'crown', nombre: 'Ajedrez de Preguntas', texto: 'Cada captura se gana respondiendo bien. Estrategia y repaso en la misma partida.' },
  { icono: 'film', nombre: 'Runner Narrativo', texto: 'Una historia en video que avanza con tus decisiones.' },
  { icono: 'brain', nombre: 'Memorama', texto: 'Encuentra las parejas y fija conceptos con memoria visual.' },
  { icono: 'layers', nombre: 'Mahjong', texto: 'Libera fichas emparejando ideas relacionadas.' },
  { icono: 'scale', nombre: 'Mesa de Cumplimiento', texto: 'Decide casos reales: aprobar, reforzar o rechazar.' },
];

const PASOS = [
  { icono: 'key-round', titulo: 'Pide tu codigo', texto: 'Tu institucion o tu docente te dan un codigo de 8 caracteres.' },
  { icono: 'user-plus', titulo: 'Crea tu cuenta', texto: 'Escribe tus datos y el codigo: entras directo a tu institucion.' },
  { icono: 'gamepad-2', titulo: 'Juega y aprende', texto: 'Inscribete a cursos, juega los modulos y ve tus calificaciones.' },
];

function irAlRegistro() {
  formulario.value?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  formulario.value?.querySelector('input')?.focus({ preventScroll: true });
}

async function registrar() {
  error.value = '';
  if (nombre.value.trim().length < 2) return (error.value = 'Escribe tu nombre completo');
  if (!/^\S+@\S+\.\S+$/.test(correo.value.trim())) return (error.value = 'Escribe un correo valido');
  if (clave.value.length < 6) return (error.value = 'La contrasena debe tener al menos 6 caracteres');
  if (codigo.value.replace(/[^a-z0-9]/gi, '').length < 4) return (error.value = 'Escribe el codigo que te dio tu institucion');
  cargando.value = true;
  try {
    const institucion = await almacen.registrar({
      nombre: nombre.value.trim(),
      correo: correo.value.trim(),
      clave: clave.value,
      codigo: codigo.value,
    });
    notificar(`Bienvenido a ${institucion}! Tu cuenta esta lista.`, 4000);
    enrutador.push({ name: 'explorar' });
  } catch (fallo) {
    error.value = mensajeDeError(fallo, 'No se pudo crear la cuenta');
  } finally {
    cargando.value = false;
  }
}

onMounted(() => {
  if (codigo.value) irAlRegistro();
});
</script>

<template>
  <div :class="estilos.pagina">
    <!-- Fondo con formas que flotan -->
    <div :class="estilos.fondo" aria-hidden="true">
      <span :class="[estilos.burbuja, estilos.b1]" />
      <span :class="[estilos.burbuja, estilos.b2]" />
      <span :class="[estilos.burbuja, estilos.b3]" />
    </div>

    <header :class="estilos.cabecera">
      <div :class="estilos.marca">
        <div :class="estilos.logo"><Icono nombre="gamepad-2" :tamano="20" /></div>
        <span :class="estilos.nombreApp">Ludus</span>
      </div>
      <nav :class="estilos.navegacion">
        <RouterLink :to="{ name: 'ingresar' }" :class="estilos.enlace">Ingresar</RouterLink>
        <Boton variante="primario" icono="user-plus" @click="irAlRegistro">Crear cuenta</Boton>
      </nav>
    </header>

    <main :class="estilos.principal">
      <section :class="estilos.heroe">
        <div :class="estilos.heroeTexto">
          <span :class="estilos.etiqueta"><Icono nombre="sparkles" :tamano="14" />Juegos educativos para tu institucion</span>
          <h1 :class="estilos.titulo">
            Aprende <span :class="estilos.degradado">jugando</span>,<br />avanza respondiendo.
          </h1>
          <p :class="estilos.bajada">
            Ludus convierte cada curso en una coleccion de juegos: ajedrez con preguntas, historias interactivas,
            memoramas y mas. Tu docente arma los modulos; tu juegas y tu nota sale de lo que sabes.
          </p>
          <div :class="estilos.acciones">
            <Boton variante="primario" icono="rocket" @click="irAlRegistro">Soy estudiante nuevo</Boton>
            <RouterLink :to="{ name: 'ingresar' }" :class="estilos.botonSecundario">
              <Icono nombre="log-in" :tamano="16" />Ya tengo cuenta
            </RouterLink>
          </div>

          <!-- Tablero decorativo -->
          <div :class="estilos.vitrina" aria-hidden="true">
            <span v-for="i in 16" :key="i" :class="[estilos.cuadro, (Math.floor((i - 1) / 4) + i) % 2 ? estilos.cuadroOscuro : '']" />
            <span :class="[estilos.ficha, estilos.f1]"><Icono nombre="crown" :tamano="22" /></span>
            <span :class="[estilos.ficha, estilos.f2]"><Icono nombre="circle-help" :tamano="22" /></span>
            <span :class="[estilos.ficha, estilos.f3]"><Icono nombre="trophy" :tamano="22" /></span>
          </div>
        </div>

        <!-- Registro -->
        <form ref="formulario" :class="estilos.tarjeta" @submit.prevent="registrar">
          <div>
            <h2 :class="estilos.tarjetaTitulo">Crea tu cuenta de estudiante</h2>
            <p :class="estilos.tarjetaTexto">Necesitas el codigo de registro de tu institucion.</p>
          </div>
          <p v-if="error" :class="estilos.error" role="alert">{{ error }}</p>
          <CampoTexto v-model="nombre" etiqueta="Nombre completo" marcador="Ana Lopez" />
          <CampoTexto v-model="correo" etiqueta="Correo" marcador="ana@correo.com" />
          <CampoTexto v-model="clave" etiqueta="Contrasena" tipo="clave" marcador="Minimo 6 caracteres" />
          <CampoTexto v-model="codigo" etiqueta="Codigo de tu institucion" marcador="ABCD-EFGH" />
          <Boton variante="primario" tipo="submit" icono="user-plus" :deshabilitado="cargando">
            {{ cargando ? 'Creando tu cuenta...' : 'Crear cuenta' }}
          </Boton>
          <p :class="estilos.pieTarjeta">
            Ya tienes cuenta? <RouterLink :to="{ name: 'ingresar' }">Ingresa aqui</RouterLink>
          </p>
        </form>
      </section>

      <section :class="estilos.seccion">
        <h2 :class="estilos.seccionTitulo">Juegos que ya puedes jugar</h2>
        <div :class="estilos.juegos">
          <article v-for="(juego, i) in JUEGOS" :key="juego.nombre" :class="estilos.juego" :style="{ '--orden': i }">
            <span :class="estilos.juegoIcono"><Icono :nombre="juego.icono" :tamano="22" /></span>
            <h3 :class="estilos.juegoNombre">{{ juego.nombre }}</h3>
            <p :class="estilos.juegoTexto">{{ juego.texto }}</p>
          </article>
        </div>
      </section>

      <section :class="estilos.seccion">
        <h2 :class="estilos.seccionTitulo">Como empiezo</h2>
        <ol :class="estilos.pasos">
          <li v-for="(paso, i) in PASOS" :key="paso.titulo" :class="estilos.paso" :style="{ '--orden': i }">
            <span :class="estilos.pasoNumero">{{ i + 1 }}</span>
            <Icono :nombre="paso.icono" :tamano="20" />
            <h3 :class="estilos.pasoTitulo">{{ paso.titulo }}</h3>
            <p :class="estilos.pasoTexto">{{ paso.texto }}</p>
          </li>
        </ol>
      </section>
    </main>

    <footer :class="estilos.pie">Ludus · Sistema de Juegos Educativos</footer>
  </div>
</template>
