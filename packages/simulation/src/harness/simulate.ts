import { maxInstant, type Instant, type ManualClock, type WorldId } from '@airline/shared';
import { nextPendingJobTime, queueStats, type JobKind } from '@airline/db';
import { processDueJobs, type EngineContext } from '../engine/index.js';

export interface SimulationProgress {
  readonly worldTime: Instant;
  readonly processed: number;
  readonly failed: number;
}

export interface SimulationStats {
  readonly iterations: number;
  readonly processed: number;
  readonly failed: number;
  readonly byKind: Readonly<Record<JobKind, number>>;
  readonly finalWorldTime: Instant;
  readonly stoppedBecause: 'reached_end' | 'no_more_jobs' | 'iteration_limit';
}

export interface SimulateOptions {
  readonly worldId: WorldId;
  readonly until: Instant;
  readonly batchSize?: number;
  readonly maxIterations?: number;
  readonly onProgress?: (progress: SimulationProgress) => void;
}

/**
 * Avanza el mundo hasta un instante dado, **sin esperar**.
 *
 * El bucle no duerme ni consulta el reloj del sistema: pregunta a la cola
 * cuándo vence el próximo trabajo, salta ahí con el reloj virtual y lo procesa.
 * De ahí que doce meses de mundo quepan en segundos (ADR-010).
 *
 * Ejecuta exactamente los mismos manejadores que el worker de producción. Si el
 * arnés dice que la economía funciona, lo dice sobre el código que va a correr
 * de verdad.
 */
export async function runSimulation(
  ctx: EngineContext,
  clock: ManualClock,
  options: SimulateOptions,
): Promise<SimulationStats> {
  const batchSize = options.batchSize ?? 500;
  const maxIterations = options.maxIterations ?? 200_000;

  const byKind: Record<JobKind, number> = {
    flight_departure: 0,
    flight_arrival: 0,
    schedule_materialize: 0,
    daily_close: 0,
  };

  let iterations = 0;
  let processed = 0;
  let failed = 0;
  let stoppedBecause: SimulationStats['stoppedBecause'] = 'iteration_limit';

  while (iterations < maxIterations) {
    const next = await nextPendingJobTime(ctx.pool, options.worldId);

    if (next === null) {
      stoppedBecause = 'no_more_jobs';
      break;
    }
    if (next > options.until) {
      stoppedBecause = 'reached_end';
      break;
    }

    clock.set(maxInstant(clock.now(), next));
    const result = await processDueJobs(ctx, clock.now(), batchSize);

    iterations += 1;
    processed += result.processed;
    failed += result.failed;
    for (const kind of Object.keys(byKind) as JobKind[]) {
      byKind[kind] += result.byKind[kind];
    }

    options.onProgress?.({
      worldTime: clock.now(),
      processed: result.processed,
      failed: result.failed,
    });

    // Si una tanda no procesa nada y no falla nada, la cola no avanza: parar
    // es mejor que girar en vacío hasta agotar el límite de iteraciones.
    if (result.processed === 0 && result.failed === 0) {
      stoppedBecause = 'no_more_jobs';
      break;
    }
  }

  return { iterations, processed, failed, byKind, finalWorldTime: clock.now(), stoppedBecause };
}

export async function pendingWork(
  ctx: EngineContext,
  worldId: WorldId,
  now: Instant,
): Promise<number> {
  const stats = await queueStats(ctx.pool, worldId, now);
  return stats.pending;
}
