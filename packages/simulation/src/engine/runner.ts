import { addDays, startOfUtcDay, utcDateKey, type Instant, type WorldId } from '@airline/shared';
import {
  claimDueJobs,
  completeJob,
  dedupeKey,
  enqueueJob,
  failJob,
  requeueStuckJobs,
  withTransaction,
  type JobKind,
  type PoolClient,
  type SimJob,
} from '@airline/db';
import type { EngineContext } from './context.js';
import { handleFlightDeparture, type DeparturePayload } from './handlers/flight-departure.js';
import { handleFlightArrival, type ArrivalPayload } from './handlers/flight-arrival.js';
import {
  handleScheduleMaterialize,
  type MaterializePayload,
} from './handlers/schedule-materialize.js';
import { handleDailyClose, type DailyClosePayload } from './handlers/daily-close.js';

export interface RunnerResult {
  readonly processed: number;
  readonly failed: number;
  readonly byKind: Readonly<Record<JobKind, number>>;
}

const EMPTY_BY_KIND: Record<JobKind, number> = {
  flight_departure: 0,
  flight_arrival: 0,
  schedule_materialize: 0,
  daily_close: 0,
};

/**
 * Despacha un trabajo al manejador que le corresponde.
 *
 * `job.runAt` —el momento en que el trabajo *debía* ejecutarse— se pasa al
 * manejador en lugar del reloj de pared. De ahí sale la propiedad de
 * recuperación: procesar con retraso da el mismo mundo que procesar a tiempo
 * (ADR-009).
 */
async function dispatch(ctx: EngineContext, tx: PoolClient, job: SimJob): Promise<void> {
  switch (job.kind) {
    case 'flight_departure':
      await handleFlightDeparture(ctx, tx, job.payload as unknown as DeparturePayload);
      return;
    case 'flight_arrival':
      await handleFlightArrival(ctx, tx, job.payload as unknown as ArrivalPayload);
      return;
    case 'schedule_materialize':
      await handleScheduleMaterialize(
        ctx,
        tx,
        job.payload as unknown as MaterializePayload,
        job.runAt,
      );
      return;
    case 'daily_close':
      await handleDailyClose(ctx, tx, job.payload as unknown as DailyClosePayload, job.runAt);
      return;
  }
}

/**
 * Procesa una tanda de trabajos vencidos.
 *
 * Cada trabajo va en su propia transacción: si uno falla, no arrastra a los
 * demás. Un fallo se reintenta con espera creciente y, agotados los intentos,
 * queda marcado para revisión. Nunca se descarta en silencio: un trabajo
 * perdido es un vuelo que se queda en el aire para siempre.
 */
export async function processDueJobs(
  ctx: EngineContext,
  now: Instant,
  limit = 200,
): Promise<RunnerResult> {
  await requeueStuckJobs(ctx.pool, now);

  const jobs = await claimDueJobs(ctx.pool, now, limit);
  const byKind: Record<JobKind, number> = { ...EMPTY_BY_KIND };
  let processed = 0;
  let failed = 0;

  for (const job of jobs) {
    try {
      await withTransaction(ctx.pool, (tx) => dispatch(ctx, tx, job));
      await completeJob(ctx.pool, job.id);
      byKind[job.kind] += 1;
      processed += 1;
    } catch (error: unknown) {
      failed += 1;
      const outcome = await failJob(ctx.pool, job, error);
      ctx.logger.error('Trabajo fallido', {
        id: job.id,
        kind: job.kind,
        attempts: job.attempts,
        outcome,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { processed, failed, byKind };
}

/**
 * Arranca un mundo: programa la materialización de plantillas y el primer
 * cierre diario. A partir de ahí, cada trabajo se reprograma solo.
 */
export async function bootstrapWorldJobs(
  tx: PoolClient,
  worldId: WorldId,
  startAt: Instant,
): Promise<void> {
  const day = startOfUtcDay(startAt);

  await enqueueJob(tx, {
    worldId,
    kind: 'schedule_materialize',
    runAt: day,
    dedupeKey: dedupeKey.scheduleMaterialize(worldId, utcDateKey(day)),
    payload: { worldId },
  });

  const firstClose = addDays(day, 1);
  await enqueueJob(tx, {
    worldId,
    kind: 'daily_close',
    runAt: firstClose,
    dedupeKey: dedupeKey.dailyClose(worldId, utcDateKey(firstClose)),
    payload: { worldId },
  });
}
