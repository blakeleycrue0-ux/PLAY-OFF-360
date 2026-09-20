import { BCN, LGW, LR250, NB160, PMI, REG70, SMALL_FIELD } from '@airline/domain/testing';
import type { Airport } from '@airline/domain';
import { databaseConfigFromEnv } from '../config.js';
import { dropSchema, ensurePartitions, migrate } from '../migrator.js';
import { createPool, type Pool } from '../pool.js';
import { upsertAircraftTypes } from '../repositories/aircraft-types.js';
import { upsertAirports } from '../repositories/airports.js';

const TEST_AIRPORTS: readonly Airport[] = [PMI, LGW, BCN, SMALL_FIELD];
const TEST_TYPES = [REG70, NB160, LR250];

function testConnectionString(env: NodeJS.ProcessEnv = process.env): string {
  const url = env['TEST_DATABASE_URL'];
  if (url === undefined || url === '') {
    throw new Error(
      'TEST_DATABASE_URL no está definida. Los tests de integración necesitan una base PostgreSQL con PostGIS.',
    );
  }
  if (url.includes('prod')) {
    throw new Error(`Negado: TEST_DATABASE_URL parece de producción (${url}).`);
  }
  return url;
}

/** Abre un pool contra la base de pruebas. No toca el esquema. */
export function createTestPool(applicationName = 'airline-test'): Pool {
  const base = databaseConfigFromEnv(process.env, applicationName);
  return createPool({ ...base, connectionString: testConnectionString() });
}

/**
 * Reconstruye el esquema de pruebas desde cero y carga el mundo estático.
 *
 * Lo ejecuta el `globalSetup` de vitest **una sola vez** por ejecución, no cada
 * fichero: reconstruir el esquema en paralelo desde varios procesos hace que
 * `CREATE EXTENSION postgis` choque consigo mismo.
 *
 * Se reconstruye entero en vez de limpiar tablas porque los tests de esta capa
 * deben probar el esquema real —particiones y restricciones incluidas— y no una
 * versión aproximada.
 */
export async function rebuildTestSchema(): Promise<void> {
  const pool = createTestPool('airline-test-setup');
  try {
    await dropSchema(pool);
    await migrate(pool);

    // Un rango generoso: el arnés simula meses y necesita sus particiones.
    await ensurePartitions(
      pool,
      new Date('2025-01-01T00:00:00Z'),
      new Date('2028-12-31T00:00:00Z'),
    );

    await upsertAirports(pool, TEST_AIRPORTS, 'fixtures');
    await upsertAircraftTypes(pool, TEST_TYPES);
  } finally {
    await pool.end();
  }
}

/** Borra los datos de juego conservando el esquema y el mundo estático. */
export async function truncateGameData(pool: Pool): Promise<void> {
  await pool.query(`
    TRUNCATE flight_events, ledger_entries, ledger_idempotency, sim_jobs,
             flights, flight_schedules, routes, aircraft, airlines, accounts, worlds
    RESTART IDENTITY CASCADE;
  `);
}
