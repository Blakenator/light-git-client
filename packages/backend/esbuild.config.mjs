import * as esbuild from 'esbuild';

const watch = process.argv.includes('--watch');

const shared = {
  bundle: true,
  platform: 'node',
  sourcemap: true,
  external: ['electron'],
};

if (watch) {
  const [mainCtx, preloadCtx] = await Promise.all([
    esbuild.context({
      ...shared,
      entryPoints: ['src/main.ts'],
      outfile: 'dist/main.js',
    }),
    esbuild.context({
      ...shared,
      entryPoints: ['src/preload.js'],
      outfile: 'dist/preload.js',
    }),
  ]);
  await Promise.all([mainCtx.watch(), preloadCtx.watch()]);
  console.log('[backend] watching for changes...');
} else {
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
}
