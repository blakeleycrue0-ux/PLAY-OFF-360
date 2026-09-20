import { err, ok, type Instant, type Result } from '@airline/shared';
import type { BalanceConfig } from '@airline/config';
import type { Aircraft } from '../entities/aircraft.js';
import type { AircraftType } from '../entities/aircraft-type.js';
import type { Airport } from '../entities/airport.js';
import { occupiedSpace, totalSeats, type CabinConfig } from '../entities/cabin.js';
import { effectiveDistanceKm } from '../time/block-time.js';

export const VIOLATION_CODES = [
  'aircraft_unavailable',
  'aircraft_not_operational',
  'insufficient_range',
  'runway_too_short_origin',
  'runway_too_short_destination',
  'maintenance_due',
  'cabin_over_capacity',
  'invalid_distance',
  'same_airport',
] as const;
export type ViolationCode = (typeof VIOLATION_CODES)[number];

export interface Violation {
  readonly code: ViolationCode;
  /**
   * Mensaje accionable para el jugador.
   *
   * No es cosmético: en un juego de gestión, la calidad de los errores es
   * diseño de juego (docs/03 §3.5). "No se puede programar" no enseña nada;
   * "aterriza a las 18:05 y necesita 35 minutos" sí.
   */
  readonly message: string;
  readonly details: Readonly<Record<string, string | number>>;
}

export interface FlightPlanValidationInput {
  readonly aircraft: Aircraft;
  readonly type: AircraftType;
  readonly origin: Airport;
  readonly destination: Airport;
  readonly distanceKm: number;
  readonly departure: Instant;
  readonly cabin: CabinConfig;
}

/**
 * Comprueba si un vuelo puede programarse.
 *
 * Devuelve **todas** las reglas incumplidas, no la primera: al jugador hay que
 * decirle todo lo que falla de una vez. Se ejecuta en el servidor como
 * autoridad y en el cliente como previsualización; el veredicto del cliente no
 * vale nada, pero evita que el jugador descubra el problema al pulsar.
 *
 * Fase 1 no valida slots, tripulación ni toque de queda: esas entidades no
 * existen todavía (ADR-012). Los códigos están abiertos a extenderse.
 */
export function validateFlightPlan(
  input: FlightPlanValidationInput,
  config: BalanceConfig,
): Result<true, readonly Violation[]> {
  const violations: Violation[] = [];
  const { aircraft, type, origin, destination } = input;

  if (origin.iata === destination.iata) {
    violations.push({
      code: 'same_airport',
      message: 'El origen y el destino no pueden ser el mismo aeropuerto.',
      details: { airport: origin.iata },
    });
  }

  if (input.distanceKm <= 0) {
    violations.push({
      code: 'invalid_distance',
      message: 'La distancia de la ruta debe ser mayor que cero.',
      details: { distanceKm: input.distanceKm },
    });
  }

  if (aircraft.availableAt > input.departure) {
    violations.push({
      code: 'aircraft_unavailable',
      message: `El ${type.name} ${aircraft.registration} no llega a tiempo: no queda libre hasta después de la hora de salida prevista, contando ${type.turnaroundMinutes} minutos de turnaround.`,
      details: {
        registration: aircraft.registration,
        availableAt: aircraft.availableAt,
        departure: input.departure,
        turnaroundMinutes: type.turnaroundMinutes,
      },
    });
  }

  if (aircraft.status !== 'idle' && aircraft.status !== 'scheduled') {
    violations.push({
      code: 'aircraft_not_operational',
      message: `El ${aircraft.registration} no está operativo: su estado es "${aircraft.status}".`,
      details: { registration: aircraft.registration, status: aircraft.status },
    });
  }

  const required = effectiveDistanceKm(input.distanceKm, config);
  if (required > type.rangeKm) {
    violations.push({
      code: 'insufficient_range',
      message: `El ${type.name} no alcanza: la ruta exige ${Math.round(required)} km y su alcance es de ${type.rangeKm} km.`,
      details: { requiredKm: Math.round(required), rangeKm: type.rangeKm },
    });
  }

  if (origin.longestRunwayFt < type.minRunwayFt) {
    violations.push({
      code: 'runway_too_short_origin',
      message: `La pista de ${origin.iata} (${origin.longestRunwayFt} ft) es demasiado corta para el ${type.name}, que necesita ${type.minRunwayFt} ft.`,
      details: {
        airport: origin.iata,
        runwayFt: origin.longestRunwayFt,
        requiredFt: type.minRunwayFt,
      },
    });
  }

  if (destination.longestRunwayFt < type.minRunwayFt) {
    violations.push({
      code: 'runway_too_short_destination',
      message: `La pista de ${destination.iata} (${destination.longestRunwayFt} ft) es demasiado corta para el ${type.name}, que necesita ${type.minRunwayFt} ft.`,
      details: {
        airport: destination.iata,
        runwayFt: destination.longestRunwayFt,
        requiredFt: type.minRunwayFt,
      },
    });
  }

  if (occupiedSpace(input.cabin, config) > type.maxSeats) {
    violations.push({
      code: 'cabin_over_capacity',
      message: `La configuración de cabina no cabe en el ${type.name}: ${totalSeats(input.cabin)} plazas ocupan más espacio del disponible (${type.maxSeats} en alta densidad).`,
      details: { seats: totalSeats(input.cabin), maxSeats: type.maxSeats },
    });
  }

  return violations.length === 0 ? ok(true) : err(violations);
}
