import { instant, type Instant, type WorldId } from '@airline/shared';
import { fromDbTimestamp, toDbTimestamp } from '../mappers/common.js';
import type { Queryable } from '../pool.js';

export const JOB_KINDS = [
  'flight_departure',
  'flight_arrival',
  'schedule_materialize',
  'daily_close',
] as const;
export type JobKind = (typeof JOB_KINDS)[number];

export interface SimJob {
  readonly id: number;
  readonly worldId: WorldId;
  readonly kind: JobKind;
  /**
   * Momento en el que el trabajo debía ejecutarse.
   *
   * Los manejadores calculan el resultado a partir de este instante y **nunca**
   * del reloj de pared. Es la propiedad que hace que un worker que arranca 40
   * minutos tarde produzca exactamente el mismo mundo que si hubiera estado
   * vivo (ADR-009).
   */
  readonly runAt: Instant;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly attempts: number;
  readonly dedupeKey: string;
}

export interface EnqueueInput {
  readonly worldId: WorldId;
  readonly kind: JobKind;
  readonly runAt: Instant;
  readonly dedupeKey: string;
  readonly payload?: Readonly<Record<string, unknown>>;
}

const COLUMNS = 'id, world_id, kind, run_at, payload, attempts, dedupe_key';

function toJob(row: Record<string, unknown>): SimJob {
  return {
    id: Number(row['id']),
    worldId: row['world_id'] as WorldId,
    kind: row['kind'] as JobKind,
    runAt: fromDbTimestamp(row['run_at'] as Date),
    payload: row['payload'] as Record<string, unknown>,
    attempts: Number(row['attempts']),
    dedupeKey: row['dedupe_key'] as string,
  };
}

/**
 * Programa un trabajo.
 *
 * Se llama dentro de la misma transacción que crea el vuelo, de modo que es
 * imposible que exista un vuelo sin su resolución pendiente. Devuelve `false`
 * si ya había un trabajo con esa clave: programar dos veces lo mismo no es un
 * error, es un no-op.
 */
export async function enqueueJob(tx: Queryable, input: EnqueueInput): Promise<boolean> {
  const result = await tx.query(
    `INSERT INTO sim_jobs (world_id, kind, run_at, payload, dedupe_key)
     VALUES ($1, $2, $3, $4::jsonb, $5)
     ON CONFLICT (dedupe_key) DO NOTHING`,
    [
      input.worldId,
      input.kind,
      toDbTimestamp(input.runAt),
      JSON.stringify(input.payload ?? {}),
      input.dedupeKey,
    ],
  );
  return (result.rowCount ?? 0) > 0;
}

/**
 * Reclama trabajos vencidos.
 *
 * `FOR UPDATE SKIP LOCKED` permite que N workers tiren de la misma cola sin
 * coordinarse ni pisarse. El orden es por `run_at`, no por inserción: tras una
 * caída, lo vencido se procesa en el orden en que debió ocurrir.
 */
export async function claimDueJobs(
  db: Queryable,
  now: Instant,
  limit = 200,
  lockSeconds = 120,
): Promise<readonly SimJob[]> {
  // `UPDATE ... RETURNING` no conserva el ORDER BY de la subconsulta: ésta
  // elige el conjunto correcto, pero el orden de las filas devueltas no está
  // definido. La CTE con ORDER BY exterior es lo que garantiza que lo vencido
  // se entregue en el orden en que debió ocurrir, que es de lo que depende la
  // recuperación tras una caída (ADR-009).
  const result = await db.query(
    `WITH claimed AS (
       UPDATE sim_jobs SET
         status = 'running',
         attempts = attempts + 1,
         locked_until = $1::timestamptz + make_interval(secs => $3),
         updated_at = now()
       WHERE id IN (
         SELECT id FROM sim_jobs
         WHERE status = 'pending' AND run_at <= $1
         ORDER BY run_at, id
         LIMIT $2
         FOR UPDATE SKIP LOCKED
       )
       RETURNING ${COLUMNS}
     )
     SELECT ${COLUMNS} FROM claimed ORDER BY run_at, id`,
    [toDbTimestamp(now), limit, lockSeconds],
  );
  return result.rows.map(toJob);
}

export async function completeJob(db: Queryable, id: number): Promise<void> {
  await db.query(
    `UPDATE sim_jobs SET status = 'done', locked_until = NULL, completed_at = now(), updated_at = now()
     WHERE id = $1`,
    [id],
  );
}

const MAX_ATTEMPTS = 5;
const BACKOFF_BASE_SECONDS = 15;

/**
 * Marca un trabajo como fallido y decide si reintentarlo.
 *
 * Reintentos con espera exponencial hasta cinco veces; después queda en
 * `failed` a la espera de revisión. No se descarta nunca en silencio: un
 * trabajo perdido es un vuelo que se queda en el aire para siempre.
 */
export async function failJob(
  db: Queryable,
  job: SimJob,
  error: unknown,
): Promise<'retry' | 'dead'> {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);

  if (job.attempts >= MAX_ATTEMPTS) {
    await db.query(
      `UPDATE sim_jobs SET status = 'failed', locked_until = NULL, last_error = $2, updated_at = now()
       WHERE id = $1`,
      [job.id, message],
    );
    return 'dead';
  }

  const delaySeconds = BACKOFF_BASE_SECONDS * 2 ** (job.attempts - 1);
  await db.query(
    `UPDATE sim_jobs SET
       status = 'pending', locked_until = NULL, last_error = $2,
       run_at = run_at + make_interval(secs => $3), updated_at = now()
     WHERE id = $1`,
    [job.id, message, delaySeconds],
  );
  return 'retry';
}

/**
 * Devuelve a la cola los trabajos cuyo worker murió a media ejecución.
 *
 * Sin esto, un proceso que cae con trabajos reclamados los dejaría bloqueados
 * para siempre. Con esto, el vencimiento del bloqueo los libera solos.
 */
export async function requeueStuckJobs(db: Queryable, now: Instant): Promise<number> {
  const result = await db.query(
    `UPDATE sim_jobs SET status = 'pending', locked_until = NULL, updated_at = now()
     WHERE status = 'running' AND locked_until IS NOT NULL AND locked_until < $1`,
    [toDbTimestamp(now)],
  );
  return result.rowCount ?? 0;
}

/**
 * Instante del próximo trabajo pendiente.
 *
 * Es lo que permite al arnés de simulación saltar en el tiempo en vez de
 * esperar: el reloj virtual avanza directamente hasta aquí (ADR-010).
 */
export async function nextPendingJobTime(db: Queryable, worldId: WorldId): Promise<Instant | null> {
  const result = await db.query<{ run_at: Date }>(
    `SELECT run_at FROM sim_jobs WHERE world_id = $1 AND status = 'pending' ORDER BY run_at LIMIT 1`,
    [worldId],
  );
  const row = result.rows[0];
  return row === undefined ? null : fromDbTimestamp(row.run_at);
}

export interface QueueStats {
  readonly pending: number;
  readonly running: number;
  readonly done: number;
  readonly failed: number;
  /** Retraso del trabajo pendiente más antiguo, en segundos. Es el indicador de salud. */
  readonly oldestPendingLagSeconds: number;
}

export async function queueStats(
  db: Queryable,
  worldId: WorldId,
  now: Instant,
): Promise<QueueStats> {
  const result = await db.query<{ status: string; total: number; oldest: Date | null }>(
    `SELECT status, count(*)::int AS total, min(run_at) AS oldest
     FROM sim_jobs WHERE world_id = $1 GROUP BY status`,
    [worldId],
  );

  const byStatus = new Map(result.rows.map((r) => [r.status, r]));
  const pending = byStatus.get('pending');
  const oldest = pending?.oldest ?? null;

  return {
    pending: pending?.total ?? 0,
    running: byStatus.get('running')?.total ?? 0,
    done: byStatus.get('done')?.total ?? 0,
    failed: byStatus.get('failed')?.total ?? 0,
    oldestPendingLagSeconds:
      oldest === null ? 0 : Math.max(0, Math.round((now - instant(oldest.getTime())) / 1000)),
  };
}

/** Claves de deduplicación. Deterministas: el mismo suceso da siempre la misma. */
export const dedupeKey = {
  flightDeparture: (flightId: string): string => `flight:${flightId}:departure`,
  flightArrival: (flightId: string): string => `flight:${flightId}:arrival`,
  scheduleMaterialize: (scheduleId: string, windowKey: string): string =>
    `schedule:${scheduleId}:materialize:${windowKey}`,
  dailyClose: (worldId: string, dayKey: string): string => `world:${worldId}:daily_close:${dayKey}`,
} as const;
