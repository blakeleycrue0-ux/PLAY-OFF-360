import type { Brand } from './brand.js';
import { DomainError } from './errors.js';

export type WorldId = Brand<string, 'WorldId'>;
export type AccountId = Brand<string, 'AccountId'>;
export type AirlineId = Brand<string, 'AirlineId'>;
export type AircraftId = Brand<string, 'AircraftId'>;
export type RouteId = Brand<string, 'RouteId'>;
export type ScheduleId = Brand<string, 'ScheduleId'>;
export type FlightId = Brand<string, 'FlightId'>;
export type JobId = Brand<string, 'JobId'>;

/** Código IATA de aeropuerto: tres letras mayúsculas (PMI, LGW). */
export type AirportCode = Brand<string, 'AirportCode'>;
/** Código del catálogo de tipos de avión del juego (NB160, LR250). Ver ADR-002. */
export type AircraftTypeCode = Brand<string, 'AircraftTypeCode'>;
/** Código ISO 3166-1 alfa-2 (ES, GB). */
export type CountryCode = Brand<string, 'CountryCode'>;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const IATA_RE = /^[A-Z]{3}$/;
const COUNTRY_RE = /^[A-Z]{2}$/;
const TYPE_CODE_RE = /^[A-Z]{2,4}[0-9]{1,4}$/;

function checked<T extends string>(value: string, re: RegExp, label: string): T {
  if (!re.test(value)) {
    throw new DomainError('invalid_identifier', `${label} inválido: "${value}"`, { value, label });
  }
  return value as T;
}

export const worldId = (v: string): WorldId => checked(v, UUID_RE, 'WorldId');
export const accountId = (v: string): AccountId => checked(v, UUID_RE, 'AccountId');
export const airlineId = (v: string): AirlineId => checked(v, UUID_RE, 'AirlineId');
export const aircraftId = (v: string): AircraftId => checked(v, UUID_RE, 'AircraftId');
export const routeId = (v: string): RouteId => checked(v, UUID_RE, 'RouteId');
export const scheduleId = (v: string): ScheduleId => checked(v, UUID_RE, 'ScheduleId');
export const flightId = (v: string): FlightId => checked(v, UUID_RE, 'FlightId');
export const airportCode = (v: string): AirportCode => checked(v.toUpperCase(), IATA_RE, 'AirportCode');
export const countryCode = (v: string): CountryCode => checked(v.toUpperCase(), COUNTRY_RE, 'CountryCode');
export const aircraftTypeCode = (v: string): AircraftTypeCode =>
  checked(v.toUpperCase(), TYPE_CODE_RE, 'AircraftTypeCode');
