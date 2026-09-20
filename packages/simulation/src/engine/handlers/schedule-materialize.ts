import { randomUUID } from 'node:crypto';
import {
  addDays,
  addMinutes,
  flightId as toFlightId,
  minutes,
  startOfUtcDay,
  utcDateKey,
  type Instant,
  type WorldId,
} from '@airline/shared';
import { calculateFlightDuration, expandSchedule } from '@airline/domain';
import {
  aircraftRepo,
  dedupeKey,
  enqueueJob,
  flightEventsRepo,
  flightsRepo,
  routesRepo,
  schedulesRepo,
  type PoolClient,
} from '@airline/db';
import { requireAircraftType, type EngineContext } from '../context.js';

export interface MaterializePayload {
  readonly worldId: WorldId;
  /** Días por delante que se materializan en cada pasada. */
  readonly horizonDays?: number;
}

export interface MaterializeOutcome {
  readonly schedules: number;
  readonly flightsCreated: number;
}

const DEFAULT_HORIZON_DAYS = 3;

/**
 * Convierte plantillas de programación en vuelos concretos.
 *
 * Los vuelos no se crean de una vez para siempre: se materializan unos días por
 * delante del reloj. Una plantilla activa durante meses no debe inundar la base
 * con vuelos que quizá se cancelen, y el jugador debe poder cambiar de opinión
 * sobre la semana que viene.
 *
 * Cada vuelo creado arrastra su trabajo de salida **en la misma transacción**:
 * no puede existir un vuelo sin resolución pendiente (ADR-009).
 */
export async function handleScheduleMaterialize(
  ctx: EngineContext,
  tx: PoolClient,
  payload: MaterializePayload,
  jobRunAt: Instant,
): Promise<MaterializeOutcome> {
  const horizonDays = payload.horizonDays ?? DEFAULT_HORIZON_DAYS;
  const horizon = addDays(startOfUtcDay(jobRunAt), horizonDays);

  const pending = await schedulesRepo.listSchedulesToMaterialize(tx, payload.worldId, horizon);
  let flightsCreated = 0;

  for (const record of pending) {
    flightsCreated += await materializeOne(ctx, tx, payload.worldId, record, horizon);
  }

  // La pasada siguiente, al día siguiente. La clave de deduplicación lleva la
  // fecha, de modo que reprocesar este trabajo no programa dos veces la misma.
  const nextRun = addDays(startOfUtcDay(jobRunAt), 1);
  await enqueueJob(tx, {
    worldId: payload.worldId,
    kind: 'schedule_materialize',
    runAt: nextRun,
    dedupeKey: dedupeKey.scheduleMaterialize(payload.worldId, utcDateKey(nextRun)),
    payload: { worldId: payload.worldId, horizonDays },
  });

  return { schedules: pending.length, flightsCreated };
}

async function materializeOne(
  ctx: EngineContext,
  tx: PoolClient,
  worldId: WorldId,
  record: {
    readonly schedule: Parameters<typeof expandSchedule>[0];
    readonly materializedUntil: Instant;
  },
  horizon: Instant,
): Promise<number> {
  const { schedule } = record;
  const route = await routesRepo.findRoute(tx, schedule.routeId);
  const aircraft = await aircraftRepo.findAircraft(tx, schedule.aircraftId);

  if (route === null || aircraft === null || route.status !== 'active') {
    // La ruta se cerró o el avión ya no está: la plantilla deja de producir.
    await schedulesRepo.updateMaterializedUntil(tx, schedule.id, horizon);
    return 0;
  }

  const type = requireAircraftType(ctx, aircraft.typeCode);
  const blockMinutes = calculateFlightDuration(route.distanceKm, type, ctx.config);
  const departures = expandSchedule(schedule, record.materializedUntil, horizon);

  let created = 0;

  for (const departure of departures) {
    const existing = await flightsRepo.findFlightBySchedule(tx, schedule.id, departure);
    if (existing !== null) continue;

    const id = toFlightId(randomUUID());
    await flightsRepo.insertFlight(tx, {
      id,
      worldId,
      airlineId: route.airlineId,
      routeId: route.id,
      aircraftId: aircraft.id,
      scheduleId: schedule.id,
      flightNumber: schedule.flightNumber,
      origin: route.origin,
      destination: route.destination,
      scheduledDeparture: departure,
      scheduledArrival: addMinutes(departure, blockMinutes),
      seatsOffered: aircraft.config,
      prices: route.prices,
      actualDeparture: null,
      actualArrival: null,
      status: 'scheduled',
      delayMinutes: minutes(0),
      pax: null,
      loadFactor: null,
      revenue: null,
      cost: null,
      profit: null,
      fuelKg: null,
      resolvedAt: null,
    });

    await enqueueJob(tx, {
      worldId,
      kind: 'flight_departure',
      runAt: departure,
      dedupeKey: dedupeKey.flightDeparture(id),
      payload: { flightId: id },
    });

    await flightEventsRepo.appendFlightEvent(tx, {
      worldId,
      flightId: id,
      flightScheduledDeparture: departure,
      kind: 'flight.created',
      occurredAt: departure,
      payload: { scheduleId: schedule.id, flightNumber: schedule.flightNumber },
    });

    created += 1;
  }

  await schedulesRepo.updateMaterializedUntil(tx, schedule.id, horizon);
  return created;
}
