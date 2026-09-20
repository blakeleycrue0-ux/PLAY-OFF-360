import {
  addMinutes,
  createRng,
  negateMoney,
  startOfUtcDay,
  addDays,
  type FlightId,
  type Instant,
  type WorldId,
} from '@airline/shared';
import {
  allocateDemand,
  calculateDemand,
  calculateFlightDuration,
  calculateFuelBurnKg,
  calculateFuelCost,
  calculateDepartureDelay,
  effectiveReliability,
  isOnTime,
  turnaroundMinutes,
  type Aircraft,
  type AircraftType,
  type Airport,
  type Flight,
  type PaxByCabin,
  type World,
} from '@airline/domain';
import {
  aircraftRepo,
  dedupeKey,
  enqueueJob,
  flightEventsRepo,
  flightsRepo,
  findMarketOffers,
  idempotencyKey,
  postLedgerEntries,
  routesRepo,
  worldsRepo,
  type PoolClient,
} from '@airline/db';
import { requireAircraftType, requireAirport, type EngineContext } from '../context.js';
import { marketContextFor, toFlightOption } from '../market-snapshot.js';

export interface DeparturePayload {
  readonly flightId: FlightId;
}

export type DepartureOutcome =
  | { readonly kind: 'departed'; readonly pax: number; readonly delayMinutes: number }
  | { readonly kind: 'cancelled'; readonly reason: string }
  | { readonly kind: 'noop'; readonly reason: string };

/**
 * Resolución de la salida de un vuelo.
 *
 * Aquí es donde se vende el pasaje: se mira el mercado del par origen-destino
 * de ese día, se reparte la demanda entre todos los competidores y a este vuelo
 * le toca lo que le toca. Luego se calcula el retraso, se cobra el combustible,
 * se ocupa el avión hasta su llegada más el turnaround y se programa el trabajo
 * de aterrizaje.
 *
 * Todo se calcula a partir de `flight.scheduledDeparture`, **nunca** del reloj
 * de pared. Es lo que hace que un worker que arranca con retraso produzca el
 * mismo mundo que si hubiera estado vivo (ADR-009).
 */
export async function handleFlightDeparture(
  ctx: EngineContext,
  tx: PoolClient,
  payload: DeparturePayload,
): Promise<DepartureOutcome> {
  const flight = await flightsRepo.findFlightForUpdate(tx, payload.flightId);
  if (flight === null) return { kind: 'noop', reason: 'el vuelo ya no existe' };

  // Guarda de estado: si ya no está programado, el trabajo se está
  // reprocesando y no hay nada que hacer (ADR-013).
  if (flight.status !== 'scheduled') {
    return { kind: 'noop', reason: `el vuelo ya está en estado "${flight.status}"` };
  }

  const world = await worldsRepo.findWorld(tx, flight.worldId);
  const route = await routesRepo.findRoute(tx, flight.routeId);
  const aircraft = await aircraftRepo.findAircraftForUpdate(tx, flight.aircraftId);
  if (world === null || route === null || aircraft === null) {
    throw new Error(`Faltan datos para resolver la salida del vuelo ${flight.id}`);
  }

  const type = requireAircraftType(ctx, aircraft.typeCode);
  const origin = requireAirport(ctx, flight.origin);
  const destination = requireAirport(ctx, flight.destination);

  const blocker = departureBlocker(aircraft, flight.origin);
  if (blocker !== null) {
    return cancelForBlocker(tx, flight, aircraft, blocker);
  }

  const plan = buildActualPlan(ctx, {
    flight,
    aircraft,
    type,
    world,
    distanceKm: route.distanceKm,
  });
  const { delay, actualDeparture, blockMinutes, estimatedArrival } = plan;

  const pax = await sellSeats(ctx, tx, {
    flightId: flight.id,
    worldId: flight.worldId,
    scheduledDeparture: flight.scheduledDeparture,
    distanceKm: route.distanceKm,
    origin,
    destination,
  });
  const paxTotal = pax.economy + pax.business;
  const seats = flight.seatsOffered.economy + flight.seatsOffered.business;
  const loadFactor = seats > 0 ? paxTotal / seats : 0;

  const fuelKg = calculateFuelBurnKg(blockMinutes, type, loadFactor, ctx.config);
  const fuelCost = calculateFuelCost(fuelKg, world.fuelPriceCentsPerKg);

  // El combustible se paga al despegar: es cuando se consume. El resto de
  // costes y los ingresos se liquidan al aterrizar.
  await postLedgerEntries(tx, [
    {
      worldId: flight.worldId,
      airlineId: flight.airlineId,
      occurredAt: actualDeparture,
      category: 'fuel',
      amount: negateMoney(fuelCost),
      idempotencyKey: idempotencyKey.flightCost(flight.id, 'fuel'),
      flightId: flight.id,
      aircraftId: flight.aircraftId,
      routeId: flight.routeId,
      description: `Combustible ${flight.flightNumber} ${flight.origin}-${flight.destination}`,
    },
  ]);

  await flightsRepo.markFlightDeparted(tx, flight.id, {
    actualDeparture,
    scheduledArrival: estimatedArrival,
    delayMinutes: delay.total,
    pax,
    loadFactor,
  });

  await aircraftRepo.markAircraftDeparted(
    tx,
    flight.aircraftId,
    addMinutes(estimatedArrival, turnaroundMinutes(type)),
  );

  await enqueueJob(tx, {
    worldId: flight.worldId,
    kind: 'flight_arrival',
    runAt: estimatedArrival,
    dedupeKey: dedupeKey.flightArrival(flight.id),
    payload: { flightId: flight.id },
  });

  await flightEventsRepo.appendFlightEvent(tx, {
    worldId: flight.worldId,
    flightId: flight.id,
    flightScheduledDeparture: flight.scheduledDeparture,
    kind: 'flight.departed',
    occurredAt: actualDeparture,
    payload: {
      delayMinutes: delay.total,
      delayBreakdown: { rotation: delay.rotation, technical: delay.technical },
      pax,
      loadFactor: Math.round(loadFactor * 1000) / 1000,
      fuelKg: Math.round(fuelKg),
      onTime: isOnTime(delay.total, ctx.config),
    },
  });

  return { kind: 'departed', pax: paxTotal, delayMinutes: delay.total };
}

/**
 * Reparte la demanda del día entre todas las ofertas del par y devuelve la que
 * corresponde a este vuelo.
 *
 * Aproximación conocida de la Fase 1 (ADR-014): el reparto se calcula en el
 * momento de cada salida contra una instantánea del día, no en un cierre de
 * mercado previo. La cuota es correcta; lo que queda incompleto es el derrame
 * hacia vuelos que ya salieron.
 */
/**
 * Motivos por los que un vuelo no puede salir.
 *
 * El de avión fuera de posición es el que hace honesta la simulación: un avión
 * que terminó su vuelo anterior en Londres no puede despegar de Palma. Sin esta
 * comprobación, una programación imposible produciría vuelos igualmente, y la
 * rotación de la flota —que es media mitad del juego— no significaría nada.
 */
interface DepartureBlocker {
  readonly reason: string;
  readonly message: string;
}

function departureBlocker(aircraft: Aircraft, origin: string): DepartureBlocker | null {
  if (
    aircraft.status === 'maintenance' ||
    aircraft.status === 'aog' ||
    aircraft.status === 'grounded'
  ) {
    return {
      reason: 'aircraft_unavailable',
      message: `avión en estado "${aircraft.status}"`,
    };
  }

  // Un avión que sigue en el aire no puede despegar de nuevo. Se distingue de
  // "fuera de posición" a propósito: son problemas distintos y se arreglan de
  // forma distinta —éste con más margen en la rotación, aquél reposicionando
  // el avión—, y confundirlos hace ilegible el diagnóstico.
  if (aircraft.status === 'in_flight') {
    return {
      reason: 'aircraft_still_airborne',
      message: 'el avión todavía no ha aterrizado de su vuelo anterior',
    };
  }

  if (aircraft.currentAirport !== origin) {
    return {
      reason: 'aircraft_out_of_position',
      message: `el avión está en ${aircraft.currentAirport} y el vuelo sale de ${origin}`,
    };
  }

  return null;
}

async function cancelForBlocker(
  tx: PoolClient,
  flight: Flight,
  aircraft: Aircraft,
  blocker: DepartureBlocker,
): Promise<DepartureOutcome> {
  await flightsRepo.cancelFlight(tx, flight.id);
  await flightEventsRepo.appendFlightEvent(tx, {
    worldId: flight.worldId,
    flightId: flight.id,
    flightScheduledDeparture: flight.scheduledDeparture,
    kind: 'flight.cancelled',
    occurredAt: flight.scheduledDeparture,
    payload: {
      reason: blocker.reason,
      aircraftStatus: aircraft.status,
      aircraftAt: aircraft.currentAirport,
    },
  });
  return { kind: 'cancelled', reason: blocker.message };
}

interface ActualPlanInput {
  readonly flight: Flight;
  readonly aircraft: Aircraft;
  readonly type: AircraftType;
  readonly world: World;
  readonly distanceKm: number;
}

interface ActualPlan {
  readonly delay: ReturnType<typeof calculateDepartureDelay>;
  readonly actualDeparture: Instant;
  readonly blockMinutes: number;
  readonly estimatedArrival: Instant;
}

/**
 * Convierte el plan previsto en el plan real de este vuelo.
 *
 * Todo parte de `flight.scheduledDeparture`, nunca del reloj de pared: es lo
 * que hace que procesar con retraso produzca el mismo mundo (ADR-009).
 */
function buildActualPlan(ctx: EngineContext, input: ActualPlanInput): ActualPlan {
  const departureYear = new Date(input.flight.scheduledDeparture).getUTCFullYear();
  const reliability = effectiveReliability(input.aircraft, input.type, departureYear, ctx.config);

  const delay = calculateDepartureDelay(
    {
      scheduledDeparture: input.flight.scheduledDeparture,
      aircraftAvailableAt: input.aircraft.availableAt,
      reliability,
    },
    ctx.config,
    createRng(input.world.seed, input.flight.id, 'departure-delay'),
  );

  const actualDeparture = addMinutes(input.flight.scheduledDeparture, delay.total);
  const blockMinutes = calculateFlightDuration(input.distanceKm, input.type, ctx.config);

  return {
    delay,
    actualDeparture,
    blockMinutes,
    estimatedArrival: addMinutes(actualDeparture, blockMinutes),
  };
}

interface SellSeatsInput {
  readonly flightId: FlightId;
  readonly worldId: WorldId;
  readonly scheduledDeparture: Instant;
  readonly distanceKm: number;
  readonly origin: Airport;
  readonly destination: Airport;
}

async function sellSeats(
  ctx: EngineContext,
  tx: PoolClient,
  input: SellSeatsInput,
): Promise<PaxByCabin> {
  const dayStart = startOfUtcDay(input.scheduledDeparture);
  const dayEnd = addDays(dayStart, 1);

  const offers = await findMarketOffers(
    tx,
    input.worldId,
    input.origin.iata,
    input.destination.iata,
    dayStart,
    dayEnd,
  );

  const options = offers.map(toFlightOption);
  const demand = calculateDemand(
    input.origin,
    input.destination,
    input.scheduledDeparture,
    ctx.config,
  );
  const allocation = allocateDemand(
    options,
    demand.bySegment,
    marketContextFor(input.distanceKm, ctx.config),
    ctx.config,
  );

  return allocation.byOption.get(input.flightId)?.pax ?? { economy: 0, business: 0 };
}
