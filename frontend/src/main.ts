import { createApp } from 'vue';
import { createPinia } from 'pinia';
import '@/estilos/variables.css';
import '@/estilos/base.css';
import App from '@/App.vue';
import { enrutador } from '@/enrutador/indice';

const app = createApp(App);
app.use(createPinia());
app.use(enrutador);
app.mount('#app');
