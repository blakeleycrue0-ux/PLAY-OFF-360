import { systemClock } from '@airline/shared';
import {
  createPool,
  databaseConfigFromEnv,
  ensurePartitions,
  queueStats,
  worldsRepo,
} from '@airline/db';
import { createEngineContext, processDueJobs } from '@airline/simulation';
import { createLogger } from './logger.js';

/**
 * Worker de simulación.
 *
 * Es un proceso separado de la API a propósito (docs/01 §1.3): un pico de gente
 * mirando el mapa no puede retrasar un aterrizaje, y una avalancha de
 * aterrizajes no puede tumbar la API.
 *
 * No mantiene estado propio. Si muere, al arrancar reclama lo vencido y el
 * mundo se pone al día con los valores correctos, porque cada manejador
 * calcula a partir del momento en que el trabajo *debía* ejecutarse y no del
 * reloj de pared (ADR-009).
 */

const POLL_INTERVAL_MS = Number(process.env['WORKER_POLL_INTERVAL_MS'] ?? 1_000);
const BATCH_SIZE = Number(process.env['WORKER_BATCH_SIZE'] ?? 200);
const PARTITION_HORIZON_DAYS = 90;

async function main(): Promise<void> {
  const logger = createLogger((process.env['LOG_LEVEL'] as 'info' | undefined) ?? 'info');
  const pool = createPool(databaseConfigFromEnv(process.env, 'airline-worker'));
  const ctx = await createEngineContext({ pool, clock: systemClock, logger });

  logger.info('Worker arrancado', {
    airports: ctx.airports.size,
    aircraftTypes: ctx.aircraftTypes.size,
    batchSize: BATCH_SIZE,
    pollIntervalMs: POLL_INTERVAL_MS,
  });

  let running = true;
  const stop = (signal: string): void => {
    logger.info('Parando el worker', { signal });
    running = false;
  };
  process.on('SIGINT', () => {
    stop('SIGINT');
  });
  process.on('SIGTERM', () => {
    stop('SIGTERM');
  });

  // Las particiones se crean por delante del calendario: si falta la del mes
  // que viene, el primer vuelo programado a esa fecha falla al insertarse.
  await ensurePartitions(pool, new Date(), addDays(new Date(), PARTITION_HORIZON_DAYS));
  let lastPartitionCheck = Date.now();

  while (running) {
    const startedAt = Date.now();

    try {
      const result = await processDueJobs(ctx, ctx.clock.now(), BATCH_SIZE);

      if (result.processed > 0 || result.failed > 0) {
        logger.info('Tanda procesada', {
          processed: result.processed,
          failed: result.failed,
          ...result.byKind,
          durationMs: Date.now() - startedAt,
        });
      }

      await reportQueueHealth(ctx, logger);

      if (Date.now() - lastPartitionCheck > 6 * 60 * 60 * 1000) {
        await ensurePartitions(pool, new Date(), addDays(new Date(), PARTITION_HORIZON_DAYS));
        lastPartitionCheck = Date.now();
      }
    } catch (error: unknown) {
      logger.error('Fallo en el bucle del worker', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    await sleep(POLL_INTERVAL_MS);
  }

  await pool.end();
  logger.info('Worker detenido');
}

/**
 * El retraso de la cola es el indicador de salud más importante del sistema
 * (docs/09 §9.3): si crece, los vuelos se resuelven tarde y el mundo se queda
 * atrás. Por encima de un minuto, hay que escalar workers.
 */
async function reportQueueHealth(
  ctx: Awaited<ReturnType<typeof createEngineContext>>,
  logger: ReturnType<typeof createLogger>,
): Promise<void> {
  const worlds = await worldsRepo.listOpenWorlds(ctx.pool);
  for (const world of worlds) {
    const stats = await queueStats(ctx.pool, world.id, ctx.clock.now());
    if (stats.oldestPendingLagSeconds > 60) {
      logger.warn('La cola va con retraso', {
        world: world.name,
        pending: stats.pending,
        lagSeconds: stats.oldestPendingLagSeconds,
      });
    }
    if (stats.failed > 0) {
      logger.warn('Hay trabajos marcados como fallidos', {
        world: world.name,
        failed: stats.failed,
      });
    }
  }
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? (error.stack ?? error.message) : error);
  process.exitCode = 1;
});
