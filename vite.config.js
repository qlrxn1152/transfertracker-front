import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const backend = 'https://transfertracker-back-v1-production.up.railway.app';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: backend,
        changeOrigin: true,
        secure: true
      }
    }
  }
});
