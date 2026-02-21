import { defineConfig } from 'tsdown';

export default defineConfig([
  {
    entry: ['src/**/*.ts', '!src/**/*.spec.ts'],
    format: ['cjs'],
    outDir: 'lib/cjs',
    dts: true,
    clean: true,
    unbundle: true,
  },
  {
    entry: ['src/**/*.ts', '!src/**/*.spec.ts'],
    format: ['esm'],
    outDir: 'lib/esm',
    dts: true,
    clean: true,
    unbundle: true,
  },
]);
