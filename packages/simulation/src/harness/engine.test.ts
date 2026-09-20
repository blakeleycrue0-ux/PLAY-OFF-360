import {
  addDays,
  addMinutes,
  ManualClock,
  minutes,
  money,
  toISO,
  type Instant,
} from '@airline/shared';
import { DEFAULT_BALANCE } from '@airline/config';
import { LGW, NB160, PMI } from '@airline/domain/testing';
import {
  aircraftRepo,
  claimDueJobs,
  dedupeKey,
  enqueueJob,
  flightEventsRepo,
  flightsRepo,
  ledgerBalance,
  nextPendingJobTime,
  reconcileAirlineCash,
  withTransaction,
  type Pool,
} from '@airline/db';
import {
  createTestPool,
  makeAircraft,
  makeAirline,
  makeFlight,
  makeRoute,
  makeSchedule,
  makeWorld,
  truncateGameData,
} from '@airline/db/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createEngineContext } from '../bootstrap.js';
import { handleFlightArrival } from '../engine/handlers/flight-arrival.js';
import { handleFlightDeparture } from '../engine/handlers/flight-departure.js';
import { bootstrapWorldJobs, processDueJobs } from '../engine/runner.js';
import type { EngineContext } from '../engine/context.js';
import { runSimulation } from './simulate.js';

let pool: Pool;
let ctx: EngineContext;
let clock: ManualClock;

const START = new Date('2026-06-01T00:00:00Z').getTime() as Instant;

beforeAll(() => {
  pool = createTestPool();
});

afterAll(async () => {
  await pool.end();
});

beforeEach(async () => {
  await truncateGameData(pool);
  clock = new ManualClock(START);
  ctx = await createEngineContext({ pool, clock, config: DEFAULT_BALANCE });
});

async function scenario() {
  const world = await makeWorld(pool, { startedAt: START });
  const airline = await makeAirline(pool, world, { cash: money(0), hub: PMI.iata });
  const aircraft = await makeAircraft(pool, world, airline, { currentAirport: PMI.iata });
  const route = await makeRoute(pool, world, airline, { origin: PMI, destination: LGW });
  const flight = await makeFlight(pool, world, airline, route, aircraft, {
    departure: addDays(world.startedAt, 1),
  });
  return { world, airline, aircraft, route, flight };
}

describe('resolución de un vuelo de principio a fin', () => {
  it('vende pasaje, cobra combustible y programa la llegada', async () => {
    const { airline, flight } = await scenario();

    const outcome = await withTransaction(pool, (tx) =>
      handleFlightDeparture(ctx, tx, { flightId: flight.id }),
    );
    expect(outcome.kind).toBe('departed');

    const departed = await flightsRepo.findFlight(pool, flight.id);
    expect(departed?.status).toBe('departed');
    expect(departed?.pax).not.toBeNull();
    expect(departed?.actualDeparture).not.toBeNull();

    // El combustible ya está pagado: la caja está en negativo antes de cobrar nada.
    expect(await ledgerBalance(pool, airline.id)).toBeLessThan(0);

    // Y la llegada queda programada: no existe un vuelo sin resolución pendiente.
    expect(await nextPendingJobTime(pool, flight.worldId)).toBe(departed?.scheduledArrival);
  });

  it('liquida la llegada y deja el avión en destino, más gastado', async () => {
    const { aircraft, flight } = await scenario();

    await withTransaction(pool, (tx) => handleFlightDeparture(ctx, tx, { flightId: flight.id }));
    const outcome = await withTransaction(pool, (tx) =>
      handleFlightArrival(ctx, tx, { flightId: flight.id }),
    );
    expect(outcome.kind).toBe('landed');

    const landed = await flightsRepo.findFlight(pool, flight.id);
    expect(landed?.status).toBe('landed');
    expect(landed?.profit).toBe((landed?.revenue ?? 0) - (landed?.cost ?? 0));

    const after = await aircraftRepo.findAircraft(pool, aircraft.id);
    expect(after?.currentAirport).toBe(LGW.iata);
    expect(after?.status).toBe('idle');
    expect(after?.cycles).toBe(aircraft.cycles + 1);
    expect(after?.flightHours).toBeGreaterThan(aircraft.flightHours);
    expect(after?.condition).toBeLessThan(aircraft.condition);
    // No queda libre al aterrizar: necesita su turnaround.
    expect(after?.availableAt).toBe(
      addMinutes(landed?.actualArrival ?? START, minutes(NB160.turnaroundMinutes)),
    );
  });

  it('deja el rastro completo en el registro de acontecimientos', async () => {
    const { flight } = await scenario();
    await withTransaction(pool, (tx) => handleFlightDeparture(ctx, tx, { flightId: flight.id }));
    await withTransaction(pool, (tx) => handleFlightArrival(ctx, tx, { flightId: flight.id }));

    const events = await flightEventsRepo.listFlightEvents(pool, flight.id);
    expect(events.map((e) => e.kind)).toEqual(['flight.departed', 'flight.landed']);
  });

  it('el resultado del vuelo cuadra con la suma de sus asientos contables', async () => {
    const { airline, flight } = await scenario();
    await withTransaction(pool, (tx) => handleFlightDeparture(ctx, tx, { flightId: flight.id }));
    await withTransaction(pool, (tx) => handleFlightArrival(ctx, tx, { flightId: flight.id }));

    const landed = await flightsRepo.findFlight(pool, flight.id);
    // La aerolínea empezó con caja cero, así que su saldo ES el resultado del vuelo.
    expect(await ledgerBalance(pool, airline.id)).toBe(landed?.profit);
    expect((await reconcileAirlineCash(pool, airline.id)).drift).toBe(0);
  });
});

describe('idempotencia de los manejadores', () => {
  it('reprocesar la salida no vuelve a vender ni a cobrar', async () => {
    const { airline, flight } = await scenario();

    await withTransaction(pool, (tx) => handleFlightDeparture(ctx, tx, { flightId: flight.id }));
    const balance = await ledgerBalance(pool, airline.id);

    const second = await withTransaction(pool, (tx) =>
      handleFlightDeparture(ctx, tx, { flightId: flight.id }),
    );

    expect(second.kind).toBe('noop');
    expect(await ledgerBalance(pool, airline.id)).toBe(balance);
  });

  it('reprocesar la llegada no duplica ingresos', async () => {
    const { airline, flight } = await scenario();

    await withTransaction(pool, (tx) => handleFlightDeparture(ctx, tx, { flightId: flight.id }));
    await withTransaction(pool, (tx) => handleFlightArrival(ctx, tx, { flightId: flight.id }));
    const balance = await ledgerBalance(pool, airline.id);

    for (let i = 0; i < 3; i++) {
      const retry = await withTransaction(pool, (tx) =>
        handleFlightArrival(ctx, tx, { flightId: flight.id }),
      );
      expect(retry.kind).toBe('noop');
    }

    expect(await ledgerBalance(pool, airline.id)).toBe(balance);
    expect((await reconcileAirlineCash(pool, airline.id)).drift).toBe(0);
  });

  it('el desgaste tampoco se aplica dos veces', async () => {
    const { aircraft, flight } = await scenario();
    await withTransaction(pool, (tx) => handleFlightDeparture(ctx, tx, { flightId: flight.id }));
    await withTransaction(pool, (tx) => handleFlightArrival(ctx, tx, { flightId: flight.id }));
    const afterFirst = await aircraftRepo.findAircraft(pool, aircraft.id);

    await withTransaction(pool, (tx) => handleFlightArrival(ctx, tx, { flightId: flight.id }));
    const afterRetry = await aircraftRepo.findAircraft(pool, aircraft.id);

    expect(afterRetry?.cycles).toBe(afterFirst?.cycles);
    expect(afterRetry?.flightHours).toBe(afterFirst?.flightHours);
  });
});

describe('recuperación tras una caída del servidor', () => {
  it('RECUPERACIÓN: procesa lo vencido con los valores que tocaban, no con los de ahora', async () => {
    const { world, flight } = await scenario();

    await enqueueJob(pool, {
      worldId: world.id,
      kind: 'flight_departure',
      runAt: flight.scheduledDeparture,
      dedupeKey: dedupeKey.flightDeparture(flight.id),
      payload: { flightId: flight.id },
    });

    // El worker arranca 40 minutos DESPUÉS de la hora de salida prevista.
    const lateStart = addMinutes(flight.scheduledDeparture, minutes(40));
    const result = await processDueJobs(ctx, lateStart);

    expect(result.processed).toBe(1);
    expect(result.failed).toBe(0);

    const departed = await flightsRepo.findFlight(pool, flight.id);

    // Lo decisivo: la salida real se calcula desde la hora PROGRAMADA y no desde
    // el momento en que el worker llegó a procesarla. El mundo resultante es el
    // mismo que si el proceso no se hubiera caído nunca.
    expect(departed?.actualDeparture).toBeLessThan(lateStart);
    expect(departed?.actualDeparture).toBeGreaterThanOrEqual(flight.scheduledDeparture);
    expect(toISO(departed?.scheduledArrival ?? START)).toBe(
      toISO(addMinutes(departed?.actualDeparture ?? START, minutes(132))),
    );
  });

  it('un trabajo reclamado por un worker que muere vuelve a la cola', async () => {
    const { world, flight } = await scenario();
    await enqueueJob(pool, {
      worldId: world.id,
      kind: 'flight_departure',
      runAt: flight.scheduledDeparture,
      dedupeKey: dedupeKey.flightDeparture(flight.id),
      payload: { flightId: flight.id },
    });

    // Un worker lo reclama con un bloqueo corto y desaparece sin terminarlo.
    await claimDueJobs(pool, flight.scheduledDeparture, 10, 60);

    // Pasado el bloqueo, otro worker lo recupera y lo termina.
    const later = addMinutes(flight.scheduledDeparture, minutes(5));
    const result = await processDueJobs(ctx, later);

    expect(result.processed).toBe(1);
    expect((await flightsRepo.findFlight(pool, flight.id))?.status).toBe('departed');
  });
});

describe('cancelaciones por imposibilidad operativa', () => {
  it('cancela si el avión está en otro aeropuerto', async () => {
    const { flight, aircraft } = await scenario();
    await pool.query(`UPDATE aircraft SET current_airport = 'LGW' WHERE id = $1`, [aircraft.id]);

    const outcome = await withTransaction(pool, (tx) =>
      handleFlightDeparture(ctx, tx, { flightId: flight.id }),
    );

    expect(outcome.kind).toBe('cancelled');
    expect((await flightsRepo.findFlight(pool, flight.id))?.status).toBe('cancelled');

    const events = await flightEventsRepo.listFlightEvents(pool, flight.id);
    expect(events[0]?.payload['reason']).toBe('aircraft_out_of_position');
  });

  it('cancela si el avión está en mantenimiento', async () => {
    const { flight, aircraft } = await scenario();
    await pool.query(`UPDATE aircraft SET status = 'maintenance' WHERE id = $1`, [aircraft.id]);

    const outcome = await withTransaction(pool, (tx) =>
      handleFlightDeparture(ctx, tx, { flightId: flight.id }),
    );
    expect(outcome.kind).toBe('cancelled');
  });
});

describe('mundo pequeño reproducible', () => {
  it('materializa plantillas, opera varios días y deja la caja cuadrada', async () => {
    const world = await makeWorld(pool, { startedAt: START, seed: 777 });
    const airline = await makeAirline(pool, world, { cash: money(0), hub: PMI.iata });

    const outbound = await makeRoute(pool, world, airline, { origin: PMI, destination: LGW });
    const inbound = await makeRoute(pool, world, airline, { origin: LGW, destination: PMI });
    const aircraft = await makeAircraft(pool, world, airline, { currentAirport: PMI.iata });

    await makeSchedule(pool, world, outbound, aircraft, {
      departureMinuteUtc: minutes(6 * 60),
      flightNumber: 'TST100',
    });
    await makeSchedule(pool, world, inbound, aircraft, {
      departureMinuteUtc: minutes(10 * 60),
      flightNumber: 'TST101',
    });

    await withTransaction(pool, (tx) => bootstrapWorldJobs(tx, world.id, world.startedAt));

    const stats = await runSimulation(ctx, clock, {
      worldId: world.id,
      until: addDays(world.startedAt, 4),
    });

    expect(stats.failed).toBe(0);
    expect(stats.byKind.flight_departure).toBeGreaterThan(4);
    expect(stats.byKind.flight_arrival).toBeGreaterThan(4);
    expect(stats.byKind.daily_close).toBeGreaterThanOrEqual(3);

    // Con dos tramos encadenados, el avión vuelve a su base cada noche.
    const finalAircraft = await aircraftRepo.findAircraft(pool, aircraft.id);
    expect(finalAircraft?.flightHours).toBeGreaterThan(8);

    // Y lo que importa por encima de todo: la contabilidad cuadra.
    expect((await reconcileAirlineCash(pool, airline.id)).drift).toBe(0);
  });

  it('el mismo escenario con la misma semilla da exactamente el mismo resultado', async () => {
    const run = async (): Promise<number> => {
      await truncateGameData(pool);
      const localClock = new ManualClock(START);
      const localCtx = await createEngineContext({
        pool,
        clock: localClock,
        config: DEFAULT_BALANCE,
      });

      const world = await makeWorld(pool, { startedAt: START, seed: 4242 });
      const airline = await makeAirline(pool, world, { cash: money(0), hub: PMI.iata });
      const out = await makeRoute(pool, world, airline, { origin: PMI, destination: LGW });
      const back = await makeRoute(pool, world, airline, { origin: LGW, destination: PMI });
      const aircraft = await makeAircraft(pool, world, airline, { currentAirport: PMI.iata });

      await makeSchedule(pool, world, out, aircraft, {
        departureMinuteUtc: minutes(6 * 60),
        flightNumber: 'DET100',
      });
      await makeSchedule(pool, world, back, aircraft, {
        departureMinuteUtc: minutes(10 * 60),
        flightNumber: 'DET101',
      });

      await withTransaction(pool, (tx) => bootstrapWorldJobs(tx, world.id, world.startedAt));
      await runSimulation(localCtx, localClock, {
        worldId: world.id,
        until: addDays(world.startedAt, 3),
      });

      return ledgerBalance(pool, airline.id);
    };

    // Determinismo (ADR-010): sin él no se puede auditar un resultado ni
    // reproducir un fallo, y el arnés de balance no valdría para nada.
    expect(await run()).toBe(await run());
  });
});
