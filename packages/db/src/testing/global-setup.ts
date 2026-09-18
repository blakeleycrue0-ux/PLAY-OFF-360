import { rebuildTestSchema } from './test-db.js';

/**
 * `globalSetup` de vitest: reconstruye el esquema de pruebas una vez por
 * ejecución, antes de que arranque ningún fichero de test.
 */
export default async function setup(): Promise<void> {
  await rebuildTestSchema();
}
