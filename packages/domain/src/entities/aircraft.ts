import type {
  AircraftId,
  AircraftTypeCode,
  AirlineId,
  AirportCode,
  Instant,
  Money,
  WorldId,
} from '@airline/shared';
import type { CabinConfig } from './cabin.js';

export const AIRCRAFT_STATUSES = [
  'idle',
  'scheduled',
  'in_flight',
  'maintenance',
  'aog',
  'grounded',
] as const;
export type AircraftStatus = (typeof AIRCRAFT_STATUSES)[number];

export const CHECK_TYPES = ['A', 'B', 'C', 'D'] as const;
export type CheckType = (typeof CHECK_TYPES)[number];

export const OWNERSHIPS = ['owned', 'leased'] as const;
export type Ownership = (typeof OWNERSHIPS)[number];

export interface Aircraft {
  readonly id: AircraftId;
  readonly worldId: WorldId;
  readonly airlineId: AirlineId;
  readonly typeCode: AircraftTypeCode;
  readonly registration: string;

  readonly ownership: Ownership;
  readonly leaseRate: Money | null;
  readonly purchasePrice: Money | null;

  readonly config: CabinConfig;

  readonly builtYear: number;
  readonly flightHours: number;
  readonly cycles: number;
  /** Estado físico, 0..100. Baja con el uso y se recupera con los checks. */
  readonly condition: number;
  readonly nextCheckType: CheckType;
  readonly nextCheckAtHours: number;
  /** Checks vencidos que el jugador ha decidido aplazar (docs/03 §3.7). */
  readonly deferredChecks: number;

  readonly status: AircraftStatus;
  readonly currentAirport: AirportCode;
  /**
   * Cuándo vuelve el avión a estar libre, turnaround incluido.
   *
   * Permite validar en tiempo constante si admite un vuelo más, sin recorrer
   * su programación entera (docs/02 §2.4).
   */
  readonly availableAt: Instant;
}
