import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  base: './',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: resolve(__dirname, 'index.html'),
    },
    target: 'es2020',
    sourcemap: true,
  },
  server: {
    port: 5174,
    open: true,
  },
});
