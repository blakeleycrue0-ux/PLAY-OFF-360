import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const pkg = (name: string): string =>
  fileURLToPath(new URL(`./packages/${name}/src/index.ts`, import.meta.url));

/**
 * Los paquetes del workspace se resuelven a `src` durante los tests para que
 * `pnpm test` funcione sin compilar antes. El typecheck (`tsc -b`) usa las
 * declaraciones de `dist`; ambos caminos parten del mismo código fuente.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@airline/shared': pkg('shared'),
      '@airline/config': pkg('config'),
      '@airline/domain': pkg('domain'),
      '@airline/db': pkg('db'),
      '@airline/simulation': pkg('simulation'),
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['packages/{shared,config,domain}/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        extends: true,
        test: {
          name: 'db',
          include: ['packages/{db,simulation}/**/*.test.ts', 'apps/**/*.test.ts'],
          environment: 'node',
          // Los tests contra PostgreSQL comparten una base; se ejecutan en serie.
          fileParallelism: false,
          hookTimeout: 60_000,
          testTimeout: 60_000,
        },
      },
    ],
  },
});
