import type { AircraftTypeCode } from '@airline/shared';

export const AIRCRAFT_CATEGORIES = ['regional', 'narrowbody', 'widebody'] as const;
export type AircraftCategory = (typeof AIRCRAFT_CATEGORIES)[number];

/**
 * Tipo de avión del catálogo del juego.
 *
 * Los nombres son ficticios por decisión de producto (ADR-002): el catálogo
 * usa designaciones funcionales por categoría y capacidad. Los parámetros sí
 * son realistas en magnitud, porque son los que mueven la economía.
 */
export interface AircraftType {
  readonly code: AircraftTypeCode;
  readonly name: string;
  readonly category: AircraftCategory;
  /** Familia para habilitaciones de tipo compartidas entre modelos. */
  readonly family: string;

  readonly maxSeats: number;
  readonly typicalSeats: number;
  readonly rangeKm: number;
  readonly cruiseSpeedKmh: number;
  readonly mtowKg: number;
  readonly minRunwayFt: number;

  readonly fuelBurnKgPerHour: number;
  readonly crewCockpit: number;
  /** Tripulantes de cabina exigidos por cada 50 asientos instalados. */
  readonly cabinCrewPer50Seats: number;

  readonly priceCents: number;
  readonly leaseRateMonthCents: number;
  readonly maintCostHourCents: number;
  readonly baseReliability: number;
  readonly turnaroundMinutes: number;
}
