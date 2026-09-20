import { addDays, instantFromISO, ManualClock, toISO, type Instant } from '@airline/shared';
import { DEFAULT_BALANCE } from '@airline/config';
import {
  createPool,
  databaseConfigFromEnv,
  dropSchema,
  ensurePartitions,
  migrate,
  withTransaction,
  aircraftTypesRepo,
  airportsRepo,
  loadAircraftTypeDataset,
  loadAirportDataset,
} from '@airline/db';
import { createEngineContext } from '../bootstrap.js';
import type { EngineLogger } from '../engine/context.js';
import { bootstrapWorldJobs } from '../engine/runner.js';
import { buildReport, formatReport } from '../harness/report.js';
import { runSimulation } from '../harness/simulate.js';
import { buildScenario } from '../harness/world-builder.js';

/**
 * `pnpm simulation:run` — escenario reproducible de principio a fin.
 *
 *   pnpm simulation:run -- --days 14 --airlines 14 --reset
 *
 * Crea un mundo, lo puebla con aerolíneas artificiales, avanza el reloj sin
 * esperar y publica los resultados. No necesita ni API ni aplicación móvil: es
 * la forma de mirar la economía antes de construir una sola pantalla.
 */

function numberArg(name: string, fallback: number): number {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return fallback;
  const value = Number(process.argv[index + 1]);
  return Number.isFinite(value) ? value : fallback;
}

function flag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function stringArg(name: string, fallback: string): string {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? fallback : (process.argv[index + 1] ?? fallback);
}

async function main(): Promise<void> {
  const days = numberArg('days', 14);
  const airlineCount = numberArg('airlines', 14);
  const airportPoolSize = numberArg('airports', 60);
  const seed = numberArg('seed', 20260601);
  const startIso = stringArg('start', '2026-06-01T00:00:00.000Z');

  const startAt: Instant = instantFromISO(startIso);
  const until: Instant = addDays(startAt, days);

  const pool = createPool(databaseConfigFromEnv(process.env, 'airline-simulation'));

  try {
    if (flag('reset')) {
      console.log('Reconstruyendo el esquema y reimportando el mundo estático…');
      await dropSchema(pool);
      await migrate(pool);

      // Un reset borra también aeropuertos y tipos de avión: hay que volver a
      // importarlos desde los snapshots versionados o no hay mundo que simular.
      const types = await loadAircraftTypeDataset();
      await aircraftTypesRepo.upsertAircraftTypes(pool, types);
      const { airports: seedAirports, source } = await loadAirportDataset();
      await airportsRepo.upsertAirports(pool, seedAirports, source);
      console.log(
        `  ${seedAirports.length} aeropuertos y ${types.length} tipos de avión importados.`,
      );
    }

    await ensurePartitions(pool, new Date(startAt), new Date(until + 86_400_000 * 40));

    const ctx = await createEngineContext({
      pool,
      clock: new ManualClock(startAt),
      logger: consoleLogger(),
    });

    console.log(
      `\nEscenario: ${airlineCount} aerolíneas · ${airportPoolSize} aeropuertos candidatos · ` +
        `${days} días desde ${toISO(startAt)}`,
    );

    const airports = [...ctx.airports.values()];
    const aircraftTypes = [...ctx.aircraftTypes.values()];

    const scenario = await buildScenario({
      pool,
      config: ctx.config,
      airports,
      aircraftTypes,
      options: {
        name: `Simulación ${seed}`,
        seed,
        startAt,
        airlineCount,
        airportPoolSize,
        configVersion: DEFAULT_BALANCE.version,
        fuelPriceCentsPerKg: DEFAULT_BALANCE.fuel.defaultPriceCentsPerKg,
      },
    });

    console.log(
      `Mundo creado: ${scenario.airlines.length} aerolíneas, ${scenario.aircraftCount} aviones, ` +
        `${scenario.routeCount} rutas, ${scenario.scheduleCount} plantillas.`,
    );

    await withTransaction(pool, (tx) => bootstrapWorldJobs(tx, scenario.world.id, startAt));

    const clock = new ManualClock(startAt);
    const contextForRun = { ...ctx, clock };

    console.log('Simulando…');
    const startedAt = Date.now();
    const stats = await runSimulation(contextForRun, clock, { worldId: scenario.world.id, until });
    const elapsedMs = Date.now() - startedAt;

    const report = await buildReport(pool, scenario.world.id, startAt, until, stats);
    console.log(formatReport(report));
    console.log(
      `  Tiempo real empleado: ${(elapsedMs / 1000).toFixed(1)} s para ${days} días de mundo.`,
    );
    console.log('');

    if (report.reconciliationFailures.length > 0) process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

function consoleLogger(): EngineLogger {
  return {
    debug: () => undefined,
    info: (message, data) => {
      console.log(`  ${message}${data === undefined ? '' : ` ${JSON.stringify(data)}`}`);
    },
    warn: (message, data) => {
      console.warn(`  ! ${message}${data === undefined ? '' : ` ${JSON.stringify(data)}`}`);
    },
    error: (message, data) => {
      console.error(`  ✗ ${message}${data === undefined ? '' : ` ${JSON.stringify(data)}`}`);
    },
  };
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? (error.stack ?? error.message) : error);
  process.exitCode = 1;
});
