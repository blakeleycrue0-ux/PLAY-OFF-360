import { addMinutes, minutes, type Instant } from '@airline/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Pool } from '../pool.js';
import { withTransaction } from '../pool.js';
import { makeWorld, T0 } from '../testing/factories.js';
import { createTestPool, truncateGameData } from '../testing/test-db.js';
import {
  claimDueJobs,
  completeJob,
  dedupeKey,
  enqueueJob,
  failJob,
  nextPendingJobTime,
  queueStats,
  requeueStuckJobs,
} from './queue.js';

let pool: Pool;

beforeAll(() => {
  pool = createTestPool();
});

afterAll(async () => {
  await pool.end();
});

beforeEach(async () => {
  await truncateGameData(pool);
});

const at = (offsetMinutes: number): Instant => addMinutes(T0, minutes(offsetMinutes));

describe('cola de trabajos', () => {
  it('programa un trabajo y lo entrega cuando vence', async () => {
    const world = await makeWorld(pool);
    await enqueueJob(pool, {
      worldId: world.id,
      kind: 'flight_departure',
      runAt: at(60),
      dedupeKey: dedupeKey.flightDeparture('vuelo-1'),
    });

    expect(await claimDueJobs(pool, at(59))).toHaveLength(0);

    const due = await claimDueJobs(pool, at(60));
    expect(due).toHaveLength(1);
    expect(due[0]?.kind).toBe('flight_departure');
    expect(due[0]?.runAt).toBe(at(60));
  });

  it('la clave de deduplicación impide programar dos veces lo mismo', async () => {
    const world = await makeWorld(pool);
    const input = {
      worldId: world.id,
      kind: 'flight_arrival' as const,
      runAt: at(30),
      dedupeKey: dedupeKey.flightArrival('vuelo-1'),
    };

    expect(await enqueueJob(pool, input)).toBe(true);
    expect(await enqueueJob(pool, input)).toBe(false);
    expect(await claimDueJobs(pool, at(60))).toHaveLength(1);
  });

  it('un trabajo reclamado no lo entrega a nadie más', async () => {
    const world = await makeWorld(pool);
    await enqueueJob(pool, {
      worldId: world.id,
      kind: 'flight_departure',
      runAt: at(10),
      dedupeKey: 'k1',
    });

    const first = await claimDueJobs(pool, at(20));
    const second = await claimDueJobs(pool, at(20));

    expect(first).toHaveLength(1);
    expect(second).toHaveLength(0);
  });

  it('entrega lo vencido en orden de vencimiento, no de inserción', async () => {
    const world = await makeWorld(pool);
    await enqueueJob(pool, {
      worldId: world.id,
      kind: 'flight_arrival',
      runAt: at(90),
      dedupeKey: 'c',
    });
    await enqueueJob(pool, {
      worldId: world.id,
      kind: 'flight_departure',
      runAt: at(10),
      dedupeKey: 'a',
    });
    await enqueueJob(pool, {
      worldId: world.id,
      kind: 'flight_arrival',
      runAt: at(50),
      dedupeKey: 'b',
    });

    const jobs = await claimDueJobs(pool, at(120));
    expect(jobs.map((j) => j.dedupeKey)).toEqual(['a', 'b', 'c']);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // El requisito explícito del encargo: el servidor se apaga, pasan 40
  // minutos, arranca, encuentra lo vencido y el mundo continúa bien.
  // ─────────────────────────────────────────────────────────────────────────

  it('RECUPERACIÓN: tras 40 minutos caído, procesa lo vencido en el orden correcto', async () => {
    const world = await makeWorld(pool);

    // Cuatro trabajos que debían ejecutarse durante la caída.
    for (const offset of [5, 15, 25, 35]) {
      await enqueueJob(pool, {
        worldId: world.id,
        kind: 'flight_arrival',
        runAt: at(offset),
        dedupeKey: `caida:${offset}`,
      });
    }
    // Y uno que todavía no toca.
    await enqueueJob(pool, {
      worldId: world.id,
      kind: 'flight_arrival',
      runAt: at(200),
      dedupeKey: 'futuro',
    });

    // El proceso arranca 40 minutos después de la primera salida prevista.
    const jobs = await claimDueJobs(pool, at(45));

    expect(jobs.map((j) => j.dedupeKey)).toEqual(['caida:5', 'caida:15', 'caida:25', 'caida:35']);

    // Lo decisivo: cada trabajo conserva el instante en el que DEBÍA ejecutarse.
    // El manejador liquidará con ese instante y no con el reloj de pared, así
    // que el mundo resultante es idéntico al que habría si no hubiera caído.
    expect(jobs.map((j) => j.runAt)).toEqual([at(5), at(15), at(25), at(35)]);

    for (const job of jobs) await completeJob(pool, job.id);
    expect(await claimDueJobs(pool, at(45))).toHaveLength(0);
  });

  it('RECUPERACIÓN: un worker que muere a media ejecución no bloquea el trabajo', async () => {
    const world = await makeWorld(pool);
    await enqueueJob(pool, {
      worldId: world.id,
      kind: 'flight_departure',
      runAt: at(10),
      dedupeKey: 'huerfano',
    });

    // Se reclama con un bloqueo de dos minutos... y el proceso muere.
    const claimed = await claimDueJobs(pool, at(10), 10, 120);
    expect(claimed).toHaveLength(1);
    expect(await claimDueJobs(pool, at(11))).toHaveLength(0);

    // Al vencer el bloqueo, otro worker lo recupera solo.
    const requeued = await requeueStuckJobs(pool, at(15));
    expect(requeued).toBe(1);

    const retried = await claimDueJobs(pool, at(15));
    expect(retried).toHaveLength(1);
    expect(retried[0]?.attempts).toBe(2);
  });

  it('reintenta con espera creciente y acaba dándolo por muerto', async () => {
    const world = await makeWorld(pool);
    await enqueueJob(pool, {
      worldId: world.id,
      kind: 'flight_departure',
      runAt: at(0),
      dedupeKey: 'fallo',
    });

    let outcome: 'retry' | 'dead' = 'retry';
    let attempts = 0;

    // Un día por delante basta para cubrir todas las esperas del backoff.
    while (outcome === 'retry' && attempts < 10) {
      const [job] = await claimDueJobs(pool, at(24 * 60));
      if (job === undefined) break;
      attempts += 1;
      outcome = await failJob(pool, job, new Error('fallo simulado'));
    }

    expect(outcome).toBe('dead');
    expect(attempts).toBe(5);

    const stats = await queueStats(pool, world.id, at(24 * 60));
    expect(stats.failed).toBe(1);
    expect(stats.pending).toBe(0);
  });

  it('sabe cuándo vence el próximo trabajo: es lo que permite saltar en el tiempo', async () => {
    const world = await makeWorld(pool);
    expect(await nextPendingJobTime(pool, world.id)).toBeNull();

    await enqueueJob(pool, {
      worldId: world.id,
      kind: 'daily_close',
      runAt: at(500),
      dedupeKey: 'x',
    });
    await enqueueJob(pool, {
      worldId: world.id,
      kind: 'flight_departure',
      runAt: at(120),
      dedupeKey: 'y',
    });

    expect(await nextPendingJobTime(pool, world.id)).toBe(at(120));
  });

  it('informa del retraso de la cola, que es su indicador de salud', async () => {
    const world = await makeWorld(pool);
    await enqueueJob(pool, {
      worldId: world.id,
      kind: 'flight_arrival',
      runAt: at(0),
      dedupeKey: 'atrasado',
    });

    const stats = await queueStats(pool, world.id, at(10));
    expect(stats.pending).toBe(1);
    expect(stats.oldestPendingLagSeconds).toBe(600);
  });

  it('el trabajo y lo que lo origina se escriben en la misma transacción', async () => {
    // Es la razón de tener la cola en PostgreSQL (ADR-009): si la transacción
    // se deshace, no queda ni el trabajo ni lo que lo motivó. No puede existir
    // un vuelo sin su resolución pendiente.
    const world = await makeWorld(pool);

    await expect(
      withTransaction(pool, async (tx) => {
        await enqueueJob(tx, {
          worldId: world.id,
          kind: 'flight_departure',
          runAt: at(10),
          dedupeKey: 'atomico',
        });
        throw new Error('el manejador falla después de encolar');
      }),
    ).rejects.toThrow();

    expect(await claimDueJobs(pool, at(60))).toHaveLength(0);
  });
});
