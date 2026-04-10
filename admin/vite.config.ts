import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/crm/',
  build: {
    outDir: '../public/admin',
    emptyOutDir: true,
  },
  server: {
    port: 5174,
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
      '/auth': { target: 'http://localhost:3000', changeOrigin: true },
      '/contacts': { target: 'http://localhost:3000', changeOrigin: true },
      '/deals': { target: 'http://localhost:3000', changeOrigin: true },
      '/sequences': { target: 'http://localhost:3000', changeOrigin: true },
      '/bookings': { target: 'http://localhost:3000', changeOrigin: true },
      '/messages': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
});
