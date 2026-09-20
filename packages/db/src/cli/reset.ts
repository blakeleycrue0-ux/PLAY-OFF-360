import { databaseConfigFromEnv } from '../config.js';
import { dropSchema, ensurePartitions, migrate } from '../migrator.js';
import { createPool } from '../pool.js';

/** `pnpm db:reset` — borra el esquema y lo reconstruye. Sólo para desarrollo. */
async function main(): Promise<void> {
  const config = databaseConfigFromEnv(process.env, 'airline-reset');

  if (config.connectionString.includes('prod')) {
    throw new Error(
      `Negado: la cadena de conexión parece de producción (${config.connectionString}).`,
    );
  }

  const pool = createPool(config);
  try {
    await dropSchema(pool);
    const applied = await migrate(pool);
    const now = new Date();
    const end = new Date(now.getTime());
    end.setUTCFullYear(end.getUTCFullYear() + 1);
    await ensurePartitions(pool, now, end);
    console.log(`Esquema reconstruido: ${applied.length} migraciones.`);
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
