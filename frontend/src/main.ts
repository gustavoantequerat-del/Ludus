import { createApp } from 'vue';
import { createPinia } from 'pinia';
import '@/estilos/variables.css';
import '@/estilos/base.css';
import App from '@/App.vue';
import { enrutador } from '@/enrutador/indice';
import { useAlmacenAutenticacion } from '@/almacenes/autenticacion';
import { iniciarAnalitica, identificarUsuario, registrarVista } from '@/utilidades/analitica';
import { opcionesPublicas } from '@/utilidades/opciones';

const app = createApp(App);
app.use(createPinia());
app.use(enrutador);

// Analytics no frena el arranque: lo que pase antes de saber el id queda en
// cola y se manda (o se descarta) cuando responde el servidor.
identificarUsuario(useAlmacenAutenticacion().usuario);
enrutador.afterEach((hacia, _desde, fallo) => {
  if (!fallo) registrarVista(String(hacia.name ?? hacia.path), hacia.path);
});
opcionesPublicas().then((opciones) => iniciarAnalitica(opciones.googleAnalyticsId));

app.mount('#app');
