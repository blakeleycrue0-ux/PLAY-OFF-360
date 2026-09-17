import type { AirlineId, AirportCode, Money, RouteId, WorldId } from '@airline/shared';
import type { ByCabin } from '@airline/config';

export const ROUTE_STATUSES = ['active', 'suspended', 'closed'] as const;
export type RouteStatus = (typeof ROUTE_STATUSES)[number];

/** Precio del billete por clase, decidido por la aerolínea. */
export type RoutePrices = ByCabin<Money>;

export interface Route {
  readonly id: RouteId;
  readonly worldId: WorldId;
  readonly airlineId: AirlineId;
  readonly origin: AirportCode;
  readonly destination: AirportCode;
  readonly distanceKm: number;
  readonly prices: RoutePrices;
  /**
   * Nivel de servicio 0..3. Sube el coste de catering y la calidad percibida,
   * y baja los ingresos auxiliares: es la palanca del modelo de bajo coste.
   */
  readonly serviceLevel: number;
  readonly status: RouteStatus;
}
