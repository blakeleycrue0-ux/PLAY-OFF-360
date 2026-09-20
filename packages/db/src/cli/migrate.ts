import { databaseConfigFromEnv } from '../config.js';
import { ensurePartitions, migrate } from '../migrator.js';
import { createPool } from '../pool.js';

/** `pnpm db:migrate` — aplica migraciones pendientes y prepara particiones. */
async function main(): Promise<void> {
  const config = databaseConfigFromEnv(process.env, 'airline-migrate');
  const pool = createPool(config);

  try {
    const applied = await migrate(pool);

    if (applied.length === 0) {
      console.log('Sin migraciones pendientes.');
    } else {
      for (const m of applied) {
        console.log(`  aplicada ${m.version} (${m.durationMs} ms)`);
      }
      console.log(`${applied.length} migraciones aplicadas.`);
    }

    // Un año de particiones por delante, suficiente para desarrollo y tests.
    const now = new Date();
    const end = new Date(now.getTime());
    end.setUTCFullYear(end.getUTCFullYear() + 1);
    const created = await ensurePartitions(pool, now, end);
    console.log(`Particiones mensuales creadas: ${created}.`);
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
