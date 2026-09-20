import {
  addMinutes,
  clamp,
  minutes,
  negateMoney,
  type FlightId,
  type Instant,
  type Money,
} from '@airline/shared';
import {
  applyFlightWear,
  calculateFlightDuration,
  calculateFlightEconomics,
  isOnTime,
  turnaroundMinutes,
  type Flight,
} from '@airline/domain';
import {
  aircraftRepo,
  airlinesRepo,
  flightEventsRepo,
  flightsRepo,
  idempotencyKey,
  postLedgerEntries,
  routesRepo,
  worldsRepo,
  type LedgerCategory,
  type LedgerEntryInput,
  type PoolClient,
} from '@airline/db';
import { requireAircraftType, requireAirport, type EngineContext } from '../context.js';

export interface ArrivalPayload {
  readonly flightId: FlightId;
}

export type ArrivalOutcome =
  | {
      readonly kind: 'landed';
      readonly profit: Money;
      readonly pax: number;
      readonly loadFactor: number;
    }
  | { readonly kind: 'noop'; readonly reason: string };

/**
 * Resolución de la llegada de un vuelo: el momento en el que se sabe si ha
 * ganado o perdido dinero.
 *
 * Todo ocurre en una transacción: ingresos, costes, desgaste del avión, estado
 * del vuelo y puntualidad de la compañía se escriben juntos o no se escribe
 * nada. No existe "medio aterrizaje".
 */
export async function handleFlightArrival(
  ctx: EngineContext,
  tx: PoolClient,
  payload: ArrivalPayload,
): Promise<ArrivalOutcome> {
  const flight = await flightsRepo.findFlightForUpdate(tx, payload.flightId);
  if (flight === null) return { kind: 'noop', reason: 'el vuelo ya no existe' };
  if (flight.status !== 'departed') {
    return { kind: 'noop', reason: `el vuelo ya está en estado "${flight.status}"` };
  }

  const world = await worldsRepo.findWorld(tx, flight.worldId);
  const route = await routesRepo.findRoute(tx, flight.routeId);
  const aircraft = await aircraftRepo.findAircraftForUpdate(tx, flight.aircraftId);
  const airline = await airlinesRepo.findAirline(tx, flight.airlineId);
  if (world === null || route === null || aircraft === null || airline === null) {
    throw new Error(`Faltan datos para liquidar el vuelo ${flight.id}`);
  }

  const type = requireAircraftType(ctx, aircraft.typeCode);
  const origin = requireAirport(ctx, flight.origin);
  const destination = requireAirport(ctx, flight.destination);

  const pax = flight.pax ?? { economy: 0, business: 0 };
  const blockMinutes = calculateFlightDuration(route.distanceKm, type, ctx.config);
  const actualArrival = flight.scheduledArrival;

  const economics = calculateFlightEconomics(
    {
      type,
      origin,
      destination,
      distanceKm: route.distanceKm,
      blockMinutes,
      seatsOffered: flight.seatsOffered,
      prices: flight.prices,
      pax,
      serviceLevel: route.serviceLevel,
      aircraftCondition: aircraft.condition,
      fuelPriceCentsPerKg: world.fuelPriceCentsPerKg,
    },
    ctx.config,
  );

  // El combustible ya se asentó al despegar; aquí va todo lo demás. El coste
  // que se guarda en el vuelo sí es el total, para que cuadre con el ledger.
  await postLedgerEntries(tx, buildSettlementEntries(flight, economics, actualArrival));

  await flightsRepo.settleFlight(tx, flight.id, {
    actualArrival,
    revenue: economics.revenue.total,
    cost: economics.cost.total,
    profit: economics.profit,
    fuelKg: economics.fuelKg,
    resolvedAt: actualArrival,
  });

  const wear = applyFlightWear(aircraft, blockMinutes, ctx.config);
  await aircraftRepo.applyAircraftArrival(tx, aircraft.id, {
    currentAirport: flight.destination,
    availableAt: addMinutes(actualArrival, turnaroundMinutes(type)),
    flightHours: wear.flightHours,
    cycles: wear.cycles,
    condition: wear.condition,
    nextCheckType: wear.nextCheckType,
    nextCheckAtHours: wear.nextCheckAtHours,
  });

  const performance = updatePerformance(airline, flight.delayMinutes, ctx.config);
  await airlinesRepo.updateAirlinePerformance(tx, airline.id, performance);

  await flightEventsRepo.appendFlightEvent(tx, {
    worldId: flight.worldId,
    flightId: flight.id,
    flightScheduledDeparture: flight.scheduledDeparture,
    kind: 'flight.landed',
    occurredAt: actualArrival,
    payload: {
      revenueCents: economics.revenue.total,
      costCents: economics.cost.total,
      profitCents: economics.profit,
      loadFactor: Math.round(economics.loadFactor * 1000) / 1000,
      paxTotal: economics.paxTotal,
    },
  });

  return {
    kind: 'landed',
    profit: economics.profit,
    pax: economics.paxTotal,
    loadFactor: economics.loadFactor,
  };
}

type Economics = ReturnType<typeof calculateFlightEconomics>;

function buildSettlementEntries(
  flight: Flight,
  economics: Economics,
  occurredAt: Instant,
): readonly LedgerEntryInput[] {
  const label = `${flight.flightNumber} ${flight.origin}-${flight.destination}`;

  const lines: readonly { category: LedgerCategory; amount: Money }[] = [
    { category: 'ticket_revenue', amount: economics.revenue.tickets },
    { category: 'ancillary_revenue', amount: economics.revenue.ancillary },
    { category: 'crew', amount: negateMoney(economics.cost.crew) },
    { category: 'maintenance', amount: negateMoney(economics.cost.maintenance) },
    { category: 'landing_fee', amount: negateMoney(economics.cost.landing) },
    { category: 'passenger_fee', amount: negateMoney(economics.cost.passengerFees) },
    { category: 'handling', amount: negateMoney(economics.cost.handling) },
    { category: 'navigation', amount: negateMoney(economics.cost.navigation) },
    { category: 'catering', amount: negateMoney(economics.cost.catering) },
  ];

  // Los asientos de importe cero no se escriben: un movimiento que no mueve
  // dinero no es un movimiento, y el ledger los rechaza por diseño.
  return lines
    .filter((line) => line.amount !== 0)
    .map((line) => ({
      worldId: flight.worldId,
      airlineId: flight.airlineId,
      occurredAt,
      category: line.category,
      amount: line.amount,
      idempotencyKey: idempotencyKey.flightCost(flight.id, line.category),
      flightId: flight.id,
      aircraftId: flight.aircraftId,
      routeId: flight.routeId,
      description: `${line.category} ${label}`,
    }));
}

/**
 * Puntualidad y reputación tras un vuelo (docs/04 §4.8, parcial).
 *
 * La puntualidad es una media móvil exponencial sobre los vuelos operados. La
 * reputación persigue a la puntualidad muy despacio: no se compra con dinero,
 * se gana operando bien durante meses, y por eso es un foso defensivo real en
 * el modelo de elección.
 *
 * La Fase 1 sólo implementa el término de puntualidad. Faltan ocupación,
 * nivel de servicio, cancelaciones, incidentes y edad de flota, que dependen
 * de sistemas aún no construidos.
 */
function updatePerformance(
  airline: { readonly onTimeRate: number; readonly reputation: number },
  delayMinutes: number,
  config: EngineContext['config'],
): { readonly reputation: number; readonly onTimeRate: number } {
  const punctual = isOnTime(minutes(delayMinutes), config) ? 100 : 0;
  const alpha = config.reputation.onTimeSmoothing;
  const onTimeRate = clamp(airline.onTimeRate * (1 - alpha) + punctual * alpha, 0, 100);

  const beta = config.reputation.smoothing;
  const reputation = clamp(
    airline.reputation + (onTimeRate - airline.reputation) * beta,
    config.reputation.min,
    config.reputation.max,
  );

  return {
    reputation: Math.round(reputation * 100) / 100,
    onTimeRate: Math.round(onTimeRate * 100) / 100,
  };
}
