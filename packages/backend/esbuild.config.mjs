import * as esbuild from 'esbuild';

const shared = {
  bundle: true,
  platform: 'node',
  sourcemap: true,
  external: ['electron'],
};

await Promise.all([
  esbuild.build({
    ...shared,
    entryPoints: ['src/main.ts'],
    outfile: 'dist/main.js',
  }),
  esbuild.build({
    ...shared,
    entryPoints: ['src/preload.js'],
    outfile: 'dist/preload.js',
  }),
]);
