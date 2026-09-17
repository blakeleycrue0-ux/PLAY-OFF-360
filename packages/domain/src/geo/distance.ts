import type { GeoPoint } from '../entities/airport.js';

/** Radio volumétrico medio de la Tierra, en kilómetros. */
export const EARTH_RADIUS_KM = 6371.0088;

const toRad = (deg: number): number => (deg * Math.PI) / 180;
const toDeg = (rad: number): number => (rad * 180) / Math.PI;

/**
 * Distancia de círculo máximo entre dos puntos, en kilómetros (haversine).
 *
 * Es la distancia de referencia del juego. La distancia realmente volada es
 * mayor —las rutas no son rectas— y se obtiene aplicando
 * `flight.routeDistanceFactor` (docs/03 §3.6).
 */
export function greatCircleDistanceKm(from: GeoPoint, to: GeoPoint): number {
  const lat1 = toRad(from.latitude);
  const lat2 = toRad(to.latitude);
  const dLat = lat2 - lat1;
  const dLon = toRad(to.longitude - from.longitude);

  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Rumbo inicial del arco de círculo máximo, en grados [0, 360). */
export function initialBearing(from: GeoPoint, to: GeoPoint): number {
  const lat1 = toRad(from.latitude);
  const lat2 = toRad(to.latitude);
  const dLon = toRad(to.longitude - from.longitude);

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

export { toRad, toDeg };
