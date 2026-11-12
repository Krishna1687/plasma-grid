import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  build: {rollupOptions: {output: {manualChunks(id) {
    if (/node_modules[\\/]three[\\/]/.test(id)) return 'three';
    if (/node_modules[\\/]recharts[\\/]/.test(id)) return 'charts';
  }}}},
});