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
          include: [/node_modules/],
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
      '@light-git/shared': path.resolve(__dirname, '../shared/src/index.ts'),
      '@light-git/core': path.resolve(__dirname, '../core/src/index.ts'),
    },
  },
  optimizeDeps: {
    exclude: ['@light-git/shared', '@light-git/core'],
  },
  publicDir: path.resolve(__dirname, '../../src/assets'),
  server: {
    port: 4200,
  },
});
