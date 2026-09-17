import { minutes, type Minutes } from '@airline/shared';
import type { BalanceConfig } from '@airline/config';
import type { AircraftType } from '../entities/aircraft-type.js';

/**
 * Tiempo de bloque de un vuelo: calzos fuera a calzos dentro (docs/03 §3.6).
 *
 * No es la distancia dividida por la velocidad de crucero: hay rodaje en
 * origen y destino, y el avión no vuela a velocidad de crucero durante la
 * subida y el descenso. Sobre trayectos cortos esas constantes pesan más que
 * el tiempo en el aire, y son la razón de que los vuelos muy cortos sean
 * económicamente malos.
 */
export function calculateFlightDuration(
  distanceKm: number,
  type: AircraftType,
  config: BalanceConfig,
): Minutes {
  const {
    taxiOutMinutes,
    taxiInMinutes,
    climbDescentPenaltyMinutes,
    routeDistanceFactor,
    minimumBlockMinutes,
  } = config.flight;

  const airborneMinutes = ((distanceKm * routeDistanceFactor) / type.cruiseSpeedKmh) * 60;
  const block = taxiOutMinutes + climbDescentPenaltyMinutes + airborneMinutes + taxiInMinutes;

  return minutes(Math.max(minimumBlockMinutes, Math.round(block)));
}

/** Distancia realmente volada, mayor que el círculo máximo por el rodeo de rutas. */
export function effectiveDistanceKm(distanceKm: number, config: BalanceConfig): number {
  return distanceKm * config.flight.routeDistanceFactor;
}

/** Tiempo mínimo en tierra entre dos vuelos del mismo avión. */
export function turnaroundMinutes(type: AircraftType): Minutes {
  return minutes(type.turnaroundMinutes);
}
