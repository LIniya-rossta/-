import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  preview: {
    allowedHosts: ['flowerskg-production.up.railway.app', 'flowerskg.up.railway.app'],
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        catalog: resolve(__dirname, 'catalog.html'),
        stores: resolve(__dirname, 'stores.html'),
        order: resolve(__dirname, 'order.html'),
      },
    },
  },
});