import type {
  AircraftId,
  AirlineId,
  AirportCode,
  FlightId,
  Instant,
  Minutes,
  Money,
  RouteId,
  ScheduleId,
  WorldId,
} from '@airline/shared';
import type { ByCabin } from '@airline/config';
import type { RoutePrices } from './route.js';

export const FLIGHT_STATUSES = ['scheduled', 'departed', 'landed', 'cancelled'] as const;
export type FlightStatus = (typeof FLIGHT_STATUSES)[number];

export type SeatsByCabin = ByCabin<number>;
export type PaxByCabin = ByCabin<number>;

/**
 * Un vuelo.
 *
 * El plan (`scheduled*`, asientos, precios) se escribe al programarlo. La
 * realidad (`actual*`, estado) se escribe al despegar. El resultado (pasaje,
 * ingresos, costes) se escribe una sola vez al aterrizar.
 *
 * **No hay latitud ni longitud.** La posición es una proyección calculable a
 * partir del plan y del reloj (docs/03 §3.2): la calcula el cliente, y el
 * servidor no la guarda ni la actualiza jamás.
 */
export interface Flight {
  readonly id: FlightId;
  readonly worldId: WorldId;
  readonly airlineId: AirlineId;
  readonly routeId: RouteId;
  readonly aircraftId: AircraftId;
  readonly scheduleId: ScheduleId | null;
  readonly flightNumber: string;

  readonly origin: AirportCode;
  readonly destination: AirportCode;

  readonly scheduledDeparture: Instant;
  readonly scheduledArrival: Instant;
  readonly seatsOffered: SeatsByCabin;
  readonly prices: RoutePrices;

  readonly actualDeparture: Instant | null;
  readonly actualArrival: Instant | null;
  readonly status: FlightStatus;
  readonly delayMinutes: Minutes;

  readonly pax: PaxByCabin | null;
  readonly loadFactor: number | null;
  readonly revenue: Money | null;
  readonly cost: Money | null;
  readonly profit: Money | null;
  readonly fuelKg: number | null;

  readonly resolvedAt: Instant | null;
}

/**
 * Lo mínimo para situar un avión en el mapa. Es lo único que viaja al cliente
 * por vuelo, y basta para animarlo sin una sola llamada de red (docs/05 §5.3).
 */
export interface FlightPlan {
  readonly id: FlightId;
  readonly flightNumber: string;
  readonly origin: AirportCode;
  readonly destination: AirportCode;
  readonly departure: Instant;
  readonly arrival: Instant;
}

export function flightPlanOf(flight: Flight): FlightPlan {
  return {
    id: flight.id,
    flightNumber: flight.flightNumber,
    origin: flight.origin,
    destination: flight.destination,
    departure: flight.actualDeparture ?? flight.scheduledDeparture,
    arrival: flight.actualArrival ?? flight.scheduledArrival,
  };
}

export function totalPax(pax: PaxByCabin): number {
  return pax.economy + pax.business;
}
