import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import commonjs from '@rollup/plugin-commonjs';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: '../../dist',
    emptyOutDir: true,
    rollupOptions: {
      plugins: [
        commonjs({
          include: [/node_modules/, /packages\/shared/],
          transformMixedEsModules: true,
          requireReturnsDefault: 'auto',
        }),
      ],
      input: {
        main: path.resolve(__dirname, 'index.html'),
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@light-git/shared': path.resolve(__dirname, '../shared/dist/index.js'),
      '@light-git/core': path.resolve(__dirname, '../core/dist/index.js'),
    },
  },
  optimizeDeps: {
    include: ['@light-git/shared', '@light-git/core'],
  },
  publicDir: path.resolve(__dirname, '../../src/assets'),
  server: {
    port: 4200,
  },
});
