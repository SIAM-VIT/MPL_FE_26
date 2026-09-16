import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Relative base: built index.html + assets work when served from /ui/landing/
  base: './',
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': 'http://127.0.0.1:8000',
      '/ui': 'http://127.0.0.1:8000',
    },
  },
  build: {
    outDir: '../landing',
    chunkSizeWarningLimit: 2000,
  },
});
