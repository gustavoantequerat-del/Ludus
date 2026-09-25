import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      // Imagenes del juego (personajes y fondos): el backend las sirve fuera
      // del prefijo /api.
      '/archivos': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
