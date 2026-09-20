import {
  addMinutes,
  aircraftId,
  aircraftTypeCode,
  airlineId,
  airportCode,
  countryCode,
  instantFromISO,
  minutes,
  money,
  routeId,
  worldId,
  type Instant,
} from '@airline/shared';
import type { Aircraft } from '../entities/aircraft.js';
import type { AircraftType } from '../entities/aircraft-type.js';
import type { Airline } from '../entities/airline.js';
import type { Airport } from '../entities/airport.js';
import type { Route } from '../entities/route.js';
import type { World } from '../entities/world.js';

/**
 * Fixtures para tests. Son valores realistas pero deliberadamente fijos, para
 * que los tests sean legibles y no dependan del conjunto de datos importado.
 * El catálogo canónico de tipos de avión vive en `data/aircraft-types.json`.
 */

const FLAT_SEASON = Object.freeze(Array.from({ length: 12 }, () => 1));
const BALEARIC_SEASON = Object.freeze([
  0.55, 0.55, 0.7, 0.95, 1.3, 1.9, 2.6, 2.55, 1.7, 1.05, 0.6, 0.6,
]);

export const PMI: Airport = {
  iata: airportCode('PMI'),
  icao: 'LEPA',
  name: 'Palma de Mallorca',
  city: 'Palma',
  country: countryCode('ES'),
  latitude: 39.5517,
  longitude: 2.73881,
  elevationFt: 27,
  timezone: 'Europe/Madrid',
  utcOffsetMinutes: 60,
  schengen: true,
  runwayCount: 2,
  longestRunwayFt: 10_735,
  sizeClass: 4,
  landingFeeCentsPerTonne: 900,
  paxFeeCents: 350,
  handlingFeeCents: 19_000,
  marketWeight: 78,
  businessIndex: 0.3,
  leisureIndex: 0.95,
  seasonality: BALEARIC_SEASON,
};

export const LGW: Airport = {
  iata: airportCode('LGW'),
  icao: 'EGKK',
  name: 'London Gatwick',
  city: 'London',
  country: countryCode('GB'),
  latitude: 51.1481,
  longitude: -0.19028,
  elevationFt: 202,
  timezone: 'Europe/London',
  utcOffsetMinutes: 0,
  schengen: false,
  runwayCount: 2,
  longestRunwayFt: 10_879,
  sizeClass: 5,
  landingFeeCentsPerTonne: 1_100,
  paxFeeCents: 600,
  handlingFeeCents: 30_000,
  marketWeight: 120,
  businessIndex: 0.7,
  leisureIndex: 0.75,
  seasonality: FLAT_SEASON,
};

export const BCN: Airport = {
  ...PMI,
  iata: airportCode('BCN'),
  icao: 'LEBL',
  name: 'Barcelona El Prat',
  city: 'Barcelona',
  latitude: 41.2971,
  longitude: 2.07846,
  sizeClass: 5,
  longestRunwayFt: 11_657,
  marketWeight: 115,
  businessIndex: 0.65,
  leisureIndex: 0.8,
  seasonality: FLAT_SEASON,
};

/** Aeropuerto regional con pista corta: sirve para probar restricciones. */
export const SMALL_FIELD: Airport = {
  ...PMI,
  iata: airportCode('IBZ'),
  icao: 'LEIB',
  name: 'Campo regional de prueba',
  city: 'Prueba',
  latitude: 38.8729,
  longitude: 1.3731,
  runwayCount: 1,
  longestRunwayFt: 5_500,
  sizeClass: 2,
  landingFeeCentsPerTonne: 500,
  paxFeeCents: 220,
  handlingFeeCents: 12_000,
  marketWeight: 22,
};

export const REG70: AircraftType = {
  code: aircraftTypeCode('REG70'),
  name: 'Regional 70',
  category: 'regional',
  family: 'REG',
  maxSeats: 78,
  typicalSeats: 70,
  rangeKm: 2_400,
  cruiseSpeedKmh: 720,
  mtowKg: 38_000,
  minRunwayFt: 4_500,
  fuelBurnKgPerHour: 1_100,
  crewCockpit: 2,
  cabinCrewPer50Seats: 1,
  priceCents: 3_200_000_000,
  leaseRateMonthCents: 19_000_000,
  maintCostHourCents: 48_000,
  baseReliability: 0.965,
  turnaroundMinutes: 25,
};

export const NB160: AircraftType = {
  code: aircraftTypeCode('NB160'),
  name: 'Narrowbody 160',
  category: 'narrowbody',
  family: 'NB',
  maxSeats: 186,
  typicalSeats: 164,
  rangeKm: 5_900,
  cruiseSpeedKmh: 840,
  mtowKg: 79_000,
  minRunwayFt: 6_600,
  fuelBurnKgPerHour: 2_400,
  crewCockpit: 2,
  cabinCrewPer50Seats: 1,
  priceCents: 9_200_000_000,
  leaseRateMonthCents: 38_000_000,
  maintCostHourCents: 77_000,
  baseReliability: 0.978,
  turnaroundMinutes: 35,
};

export const LR250: AircraftType = {
  code: aircraftTypeCode('LR250'),
  name: 'Long Range 250',
  category: 'widebody',
  family: 'LR',
  maxSeats: 300,
  typicalSeats: 256,
  rangeKm: 13_500,
  cruiseSpeedKmh: 900,
  mtowKg: 254_000,
  minRunwayFt: 8_500,
  fuelBurnKgPerHour: 5_900,
  crewCockpit: 2,
  cabinCrewPer50Seats: 1.2,
  priceCents: 24_500_000_000,
  leaseRateMonthCents: 98_000_000,
  maintCostHourCents: 190_000,
  baseReliability: 0.974,
  turnaroundMinutes: 75,
};

export const WORLD_START: Instant = instantFromISO('2026-03-01T00:00:00.000Z');

export const TEST_WORLD: World = {
  id: worldId('11111111-1111-4111-8111-111111111111'),
  name: 'Mundo de prueba',
  seed: 20260301,
  timeScale: 1,
  startedAt: WORLD_START,
  configVersion: '2026.09-phase1',
  fuelPriceCentsPerKg: 92,
  status: 'open',
};

export const TEST_AIRLINE: Airline = {
  id: airlineId('22222222-2222-4222-8222-222222222222'),
  worldId: TEST_WORLD.id,
  accountId: null,
  name: 'Compañía de prueba',
  iataCode: 'TS',
  icaoCode: 'TST',
  country: countryCode('ES'),
  hub: PMI.iata,
  businessModel: 'lowcost',
  controller: 'npc',
  npcStrategy: 'lowcost',
  cash: money(5_000_000_000),
  reputation: 50,
  onTimeRate: 85,
  foundedAt: WORLD_START,
  isActive: true,
};

export const TEST_AIRCRAFT: Aircraft = {
  id: aircraftId('33333333-3333-4333-8333-333333333333'),
  worldId: TEST_WORLD.id,
  airlineId: TEST_AIRLINE.id,
  typeCode: NB160.code,
  registration: 'EC-TST',
  ownership: 'leased',
  leaseRate: money(38_000_000),
  purchasePrice: null,
  config: { economy: 170, business: 8 },
  builtYear: 2022,
  flightHours: 1_200,
  cycles: 780,
  condition: 100,
  nextCheckType: 'A',
  nextCheckAtHours: 1_800,
  deferredChecks: 0,
  status: 'idle',
  currentAirport: PMI.iata,
  availableAt: WORLD_START,
};

export const TEST_ROUTE: Route = {
  id: routeId('44444444-4444-4444-8444-444444444444'),
  worldId: TEST_WORLD.id,
  airlineId: TEST_AIRLINE.id,
  origin: PMI.iata,
  destination: LGW.iata,
  distanceKm: 1_309,
  prices: { economy: money(8_990), business: money(24_900) },
  serviceLevel: 2,
  status: 'active',
};

export function departureAt(iso: string): Instant {
  return instantFromISO(iso);
}

export function plusMinutes(from: Instant, m: number): Instant {
  return addMinutes(from, minutes(m));
}
