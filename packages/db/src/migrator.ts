import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Pool } from './pool.js';
import { withTransaction } from './pool.js';

// Resuelve igual desde `src` (con tsx) que desde `dist` (compilado).
const MIGRATIONS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'migrations',
);

export interface Migration {
  readonly version: string;
  readonly filename: string;
  readonly sql: string;
  readonly checksum: string;
}

export interface AppliedMigration {
  readonly version: string;
  readonly checksum: string;
  readonly durationMs: number;
}

const BOOTSTRAP = `
  CREATE TABLE IF NOT EXISTS schema_migrations (
    version     text PRIMARY KEY,
    checksum    text NOT NULL,
    applied_at  timestamptz NOT NULL DEFAULT now(),
    duration_ms integer NOT NULL
  );
`;

export async function loadMigrations(directory = MIGRATIONS_DIR): Promise<readonly Migration[]> {
  const entries = (await readdir(directory)).filter((f) => f.endsWith('.sql')).sort();

  return Promise.all(
    entries.map(async (filename) => {
      const sql = await readFile(path.join(directory, filename), 'utf8');
      return {
        version: filename.replace(/\.sql$/, ''),
        filename,
        sql,
        checksum: createHash('sha256').update(sql).digest('hex'),
      };
    }),
  );
}

/**
 * Aplica las migraciones pendientes.
 *
 * Cada migración corre en su propia transacción: si una falla, deja la base en
 * el último estado consistente en vez de a medio camino.
 *
 * Se guarda la huella de cada fichero aplicado y se compara al arrancar. Editar
 * una migración ya aplicada es un error y se detiene el proceso: en un sistema
 * con dinero de por medio, que dos entornos crean tener el mismo esquema
 * teniéndolo distinto es peor que no arrancar.
 */
export async function migrate(
  pool: Pool,
  directory = MIGRATIONS_DIR,
): Promise<readonly AppliedMigration[]> {
  await pool.query(BOOTSTRAP);

  const available = await loadMigrations(directory);
  const applied = await pool.query<{ version: string; checksum: string }>(
    'SELECT version, checksum FROM schema_migrations',
  );
  const appliedByVersion = new Map(applied.rows.map((r) => [r.version, r.checksum]));

  for (const migration of available) {
    const previousChecksum = appliedByVersion.get(migration.version);
    if (previousChecksum !== undefined && previousChecksum !== migration.checksum) {
      throw new Error(
        `La migración ${migration.filename} ha cambiado desde que se aplicó.\n` +
          `  aplicada: ${previousChecksum}\n  actual:   ${migration.checksum}\n` +
          'Las migraciones aplicadas son inmutables: crea una nueva en vez de editar ésta.',
      );
    }
  }

  const results: AppliedMigration[] = [];

  for (const migration of available) {
    if (appliedByVersion.has(migration.version)) continue;

    const startedAt = Date.now();
    await withTransaction(pool, async (tx) => {
      await tx.query(migration.sql);
      await tx.query(
        'INSERT INTO schema_migrations (version, checksum, duration_ms) VALUES ($1, $2, $3)',
        [migration.version, migration.checksum, Date.now() - startedAt],
      );
    });

    results.push({
      version: migration.version,
      checksum: migration.checksum,
      durationMs: Date.now() - startedAt,
    });
  }

  return results;
}

/**
 * Garantiza que existen las particiones mensuales del rango pedido.
 *
 * El arnés de simulación llama a esto antes de simular meses de golpe; el
 * worker, para ir por delante del calendario.
 */
export async function ensurePartitions(pool: Pool, from: Date, to: Date): Promise<number> {
  const result = await pool.query<{ created: number }>(
    'SELECT sim_ensure_partitions($1, $2) AS created',
    [from.toISOString(), to.toISOString()],
  );
  return result.rows[0]?.created ?? 0;
}

/** Borra el esquema por completo. Sólo para desarrollo y tests. */
export async function dropSchema(pool: Pool): Promise<void> {
  await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
}
