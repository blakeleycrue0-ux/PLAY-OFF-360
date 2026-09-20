/**
 * Proyección Mercator del mapa del juego.
 *
 * Vive en un único sitio a propósito. Antes había dos: una en el constructor
 * del mapa y otra escrita a mano en el exportador, y no coincidían —la segunda
 * estiraba longitud y latitud por separado, que no es una Mercator— así que los
 * aeropuertos caían fuera de sus países. Con una sola fórmula, el mapa, los
 * aeropuertos y los aviones no pueden desalinearse.
 */

export interface MapBounds {
  readonly west: number;
  readonly east: number;
  readonly south: number;
  readonly north: number;
}

export interface Projection {
  readonly scale: number;
  readonly translateX: number;
  readonly translateY: number;
  readonly width: number;
  readonly height: number;
}

const RAD = Math.PI / 180;

/** Latitud proyectada de Mercator, sin escalar. */
export function mercatorY(latitude: number): number {
  return Math.log(Math.tan(Math.PI / 4 + (latitude * RAD) / 2));
}

/**
 * Ajusta la proyección al ancho pedido y deduce el alto.
 *
 * El alto **no** se elige: en una proyección conforme lo fija la escala, y
 * forzarlo deformaría el mapa. Por eso el encuadre declara los límites y el
 * ancho, y el alto sale de la cuenta.
 */
export function fitProjection(bounds: MapBounds, width: number): Projection {
  const scale = width / ((bounds.east - bounds.west) * RAD);
  const top = mercatorY(bounds.north);
  const bottom = mercatorY(bounds.south);

  return {
    scale,
    translateX: -scale * bounds.west * RAD,
    translateY: scale * top,
    width,
    height: Math.round(scale * (top - bottom)),
  };
}

export function projectPoint(
  projection: Projection,
  longitude: number,
  latitude: number,
): { x: number; y: number } {
  return {
    x: projection.translateX + projection.scale * longitude * RAD,
    y: projection.translateY - projection.scale * mercatorY(latitude),
  };
}
