import { clamp, type Instant } from '@airline/shared';
import type { GeoPoint } from '../entities/airport.js';
import {
  EARTH_RADIUS_KM,
  greatCircleDistanceKm,
  initialBearing,
  toDeg,
  toRad,
} from './distance.js';

export const FLIGHT_PHASES = ['scheduled', 'climb', 'cruise', 'descent', 'arrived'] as const;
export type FlightPhase = (typeof FLIGHT_PHASES)[number];

export interface FlightPosition extends GeoPoint {
  readonly heading: number;
  readonly altitudeMeters: number;
  readonly phase: FlightPhase;
  /** Fracción de trayecto recorrida, 0..1. */
  readonly progress: number;
}

/**
 * Interpolación esférica sobre el arco de círculo máximo.
 *
 * Interpolar linealmente latitud y longitud daría una trayectoria visiblemente
 * equivocada en rutas largas (y cruzaría mal el antimeridiano). Esto sigue el
 * arco real.
 */
export function interpolateGreatCircle(from: GeoPoint, to: GeoPoint, fraction: number): GeoPoint {
  const f = clamp(fraction, 0, 1);
  const distance = greatCircleDistanceKm(from, to);
  const angular = distance / EARTH_RADIUS_KM;

  // Puntos coincidentes o casi: el seno del ángulo tiende a cero.
  if (angular < 1e-9) return { latitude: from.latitude, longitude: from.longitude };

  const sinAngular = Math.sin(angular);
  const a = Math.sin((1 - f) * angular) / sinAngular;
  const b = Math.sin(f * angular) / sinAngular;

  const lat1 = toRad(from.latitude);
  const lon1 = toRad(from.longitude);
  const lat2 = toRad(to.latitude);
  const lon2 = toRad(to.longitude);

  const x = a * Math.cos(lat1) * Math.cos(lon1) + b * Math.cos(lat2) * Math.cos(lon2);
  const y = a * Math.cos(lat1) * Math.sin(lon1) + b * Math.cos(lat2) * Math.sin(lon2);
  const z = a * Math.sin(lat1) + b * Math.sin(lat2);

  return {
    latitude: toDeg(Math.atan2(z, Math.hypot(x, y))),
    longitude: toDeg(Math.atan2(y, x)),
  };
}

/** Altitud de crucero típica según la distancia, en metros. */
function cruiseAltitude(distanceKm: number): number {
  return distanceKm < 500 ? 7_500 : distanceKm < 1_500 ? 10_000 : 11_600;
}

/** Perfil vertical simplificado: subida, crucero y descenso. */
export function altitudeProfile(fraction: number, distanceKm: number): number {
  const cruise = cruiseAltitude(distanceKm);
  if (fraction <= 0.08) return cruise * (fraction / 0.08);
  if (fraction >= 0.88) return cruise * ((1 - fraction) / 0.12);
  return cruise;
}

export function phaseFor(fraction: number): FlightPhase {
  if (fraction <= 0) return 'scheduled';
  if (fraction >= 1) return 'arrived';
  return fraction < 0.08 ? 'climb' : fraction > 0.88 ? 'descent' : 'cruise';
}

/**
 * Posición de un avión como función pura del reloj.
 *
 * Ésta es la decisión que sostiene toda la arquitectura (docs/01 §1.2): el
 * servidor no guarda ni actualiza posiciones. Todos los jugadores calculan
 * esta misma función sobre los mismos datos y ven el avión en el mismo sitio,
 * sin que nadie difunda nada.
 */
export function calculateFlightPosition(
  origin: GeoPoint,
  destination: GeoPoint,
  departure: Instant,
  arrival: Instant,
  now: Instant,
): FlightPosition {
  const total = arrival - departure;
  const fraction = total <= 0 ? 1 : clamp((now - departure) / total, 0, 1);

  const point = interpolateGreatCircle(origin, destination, fraction);
  const distanceKm = greatCircleDistanceKm(origin, destination);

  // Rumbo hacia el destino desde donde está ahora; al llegar, el último rumbo válido.
  const heading =
    fraction >= 1 ? initialBearing(origin, destination) : initialBearing(point, destination);

  return {
    latitude: point.latitude,
    longitude: point.longitude,
    heading,
    altitudeMeters: altitudeProfile(fraction, distanceKm),
    phase: phaseFor(fraction),
    progress: fraction,
  };
}
