import { randomUUID } from 'node:crypto';
import {
  addDays,
  addMinutes,
  airlineId as toAirlineId,
  aircraftId as toAircraftId,
  flightId as toFlightId,
  instantFromISO,
  minutes,
  money,
  routeId as toRouteId,
  scheduleId as toScheduleId,
  worldId as toWorldId,
  type Instant,
  type Money,
} from '@airline/shared';
import {
  calculateFlightDuration,
  greatCircleDistanceKm,
  type Aircraft,
  type Airline,
  type Airport,
  type AircraftType,
  type Flight,
  type FlightSchedule,
  type Route,
  type World,
} from '@airline/domain';
import { DEFAULT_BALANCE } from '@airline/config';
import { LGW, NB160, PMI } from '@airline/domain/testing';
import type { Queryable } from '../pool.js';
import { insertAircraft } from '../repositories/aircraft.js';
import { insertAirline } from '../repositories/airlines.js';
import { insertFlight } from '../repositories/flights.js';
import { insertRoute } from '../repositories/routes.js';
import { insertSchedule } from '../repositories/schedules.js';
import { insertWorld } from '../repositories/worlds.js';

export const T0: Instant = instantFromISO('2026-06-01T00:00:00.000Z');

export async function makeWorld(db: Queryable, overrides: Partial<World> = {}): Promise<World> {
  return insertWorld(db, {
    id: toWorldId(randomUUID()),
    name: 'Mundo de prueba',
    seed: 424242,
    timeScale: 1,
    startedAt: T0,
    configVersion: DEFAULT_BALANCE.version,
    fuelPriceCentsPerKg: DEFAULT_BALANCE.fuel.defaultPriceCentsPerKg,
    status: 'open',
    ...overrides,
  });
}

let airlineCounter = 0;

export async function makeAirline(
  db: Queryable,
  world: World,
  overrides: Partial<Airline> = {},
): Promise<Airline> {
  airlineCounter += 1;
  const suffix = airlineCounter.toString(36).toUpperCase().padStart(2, '0');

  return insertAirline(db, {
    id: toAirlineId(randomUUID()),
    worldId: world.id,
    accountId: null,
    name: `Aerolínea ${suffix}`,
    iataCode: suffix.slice(0, 2),
    icaoCode: `A${suffix.slice(0, 2)}`
      .slice(0, 3)
      .padEnd(3, 'X')
      .replace(/[^A-Z]/g, 'X'),
    country: PMI.country,
    hub: PMI.iata,
    businessModel: 'lowcost',
    controller: 'npc',
    npcStrategy: 'lowcost',
    cash: money(5_000_000_000),
    reputation: 50,
    onTimeRate: 90,
    foundedAt: world.startedAt,
    isActive: true,
    ...overrides,
  });
}

let registrationCounter = 0;

export async function makeAircraft(
  db: Queryable,
  world: World,
  airline: Airline,
  overrides: Partial<Aircraft> = {},
): Promise<Aircraft> {
  registrationCounter += 1;

  return insertAircraft(db, {
    id: toAircraftId(randomUUID()),
    worldId: world.id,
    airlineId: airline.id,
    typeCode: NB160.code,
    registration: `EC-T${registrationCounter.toString().padStart(3, '0')}`,
    ownership: 'leased',
    leaseRate: money(NB160.leaseRateMonthCents),
    purchasePrice: null,
    config: { economy: 170, business: 8 },
    builtYear: 2023,
    flightHours: 500,
    cycles: 320,
    condition: 96,
    nextCheckType: 'A',
    nextCheckAtHours: 600,
    deferredChecks: 0,
    status: 'idle',
    currentAirport: PMI.iata,
    availableAt: world.startedAt,
    ...overrides,
  });
}

export async function makeRoute(
  db: Queryable,
  world: World,
  airline: Airline,
  options: {
    readonly origin?: Airport;
    readonly destination?: Airport;
    readonly economyPrice?: Money;
    readonly businessPrice?: Money;
    readonly serviceLevel?: number;
  } = {},
): Promise<Route> {
  const origin = options.origin ?? PMI;
  const destination = options.destination ?? LGW;

  const route: Route = {
    id: toRouteId(randomUUID()),
    worldId: world.id,
    airlineId: airline.id,
    origin: origin.iata,
    destination: destination.iata,
    distanceKm: Math.round(greatCircleDistanceKm(origin, destination)),
    prices: {
      economy: options.economyPrice ?? money(8_990),
      business: options.businessPrice ?? money(24_900),
    },
    serviceLevel: options.serviceLevel ?? 2,
    status: 'active',
  };

  return insertRoute(db, route, world.startedAt);
}

export async function makeSchedule(
  db: Queryable,
  world: World,
  route: Route,
  aircraft: Aircraft,
  overrides: Partial<FlightSchedule> = {},
): Promise<FlightSchedule> {
  const schedule: FlightSchedule = {
    id: toScheduleId(randomUUID()),
    routeId: route.id,
    aircraftId: aircraft.id,
    daysOfWeek: 127,
    departureMinuteUtc: minutes(8 * 60),
    flightNumber: 'TST204',
    validFrom: world.startedAt,
    validTo: null,
    isActive: true,
    ...overrides,
  };

  return insertSchedule(db, world.id, schedule, world.startedAt);
}

export async function makeFlight(
  db: Queryable,
  world: World,
  airline: Airline,
  route: Route,
  aircraft: Aircraft,
  options: {
    readonly departure?: Instant;
    readonly type?: AircraftType;
    readonly flightNumber?: string;
    readonly scheduleId?: FlightSchedule['id'];
  } = {},
): Promise<Flight> {
  const type = options.type ?? NB160;
  const departure = options.departure ?? addDays(world.startedAt, 1);
  const block = calculateFlightDuration(route.distanceKm, type, DEFAULT_BALANCE);

  return insertFlight(db, {
    id: toFlightId(randomUUID()),
    worldId: world.id,
    airlineId: airline.id,
    routeId: route.id,
    aircraftId: aircraft.id,
    scheduleId: options.scheduleId ?? null,
    flightNumber: options.flightNumber ?? 'TST204',
    origin: route.origin,
    destination: route.destination,
    scheduledDeparture: departure,
    scheduledArrival: addMinutes(departure, block),
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
}
