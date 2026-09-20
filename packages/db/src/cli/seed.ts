import { databaseConfigFromEnv } from '../config.js';
import { createPool } from '../pool.js';
import { upsertAircraftTypes } from '../repositories/aircraft-types.js';
import { upsertAirports } from '../repositories/airports.js';
import { loadAircraftTypeDataset, loadAirportDataset } from '../seed/load-dataset.js';

/** `pnpm db:seed` — importa el mundo estático desde los snapshots versionados. */
async function main(): Promise<void> {
  const pool = createPool(databaseConfigFromEnv(process.env, 'airline-seed'));

  try {
    const types = await loadAircraftTypeDataset();
    await upsertAircraftTypes(pool, types);
    console.log(`Tipos de avión importados: ${types.length}`);

    const { airports, source } = await loadAirportDataset();
    const written = await upsertAirports(pool, airports, source);
    console.log(`Aeropuertos importados: ${written}`);
    console.log(`Procedencia: ${source}`);
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
