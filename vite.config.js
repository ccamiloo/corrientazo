import { defineConfig } from 'vite';

export default defineConfig({
  // Rutas relativas para que el build funcione servido desde cualquier carpeta.
  base: './',
  server: { port: 5173, open: false },
  // Phaser solo ya pesa ~1.3 MB minificado; subimos el umbral para que el aviso no sea ruido.
  build: { chunkSizeWarningLimit: 1600 },
});
