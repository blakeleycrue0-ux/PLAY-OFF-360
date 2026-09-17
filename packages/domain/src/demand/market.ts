import type { AirlineId, Minutes, Money } from '@airline/shared';
import type { SeatsByCabin } from '../entities/flight.js';
import type { RoutePrices } from '../entities/route.js';

/**
 * Una oferta en el mercado de un par origen-destino: un vuelo concreto de una
 * aerolínea concreta, con su precio, su horario y su producto.
 *
 * El pasajero elige entre todas las ofertas del par y la opción de no volar.
 */
export interface FlightOption {
  /** Identificador estable de la oferta dentro del mercado. */
  readonly key: string;
  readonly airlineId: AirlineId;
  readonly prices: RoutePrices;
  readonly seats: SeatsByCabin;
  /** Hora de salida en minutos desde medianoche UTC. */
  readonly departureMinuteUtc: Minutes;
  /** Desfase del aeropuerto de origen respecto a UTC, en minutos. */
  readonly originUtcOffsetMinutes: number;
  readonly weeklyFrequency: number;
  readonly reputation: number;
  readonly onTimeRate: number;
  /** Calidad de producto percibida, 0..1: cabina y nivel de servicio. */
  readonly productScore: number;
  /** Ventaja de operador establecido en el origen, 0..1. */
  readonly loyalty: number;
  readonly stops: number;
}

export interface MarketContext {
  /** Precio de referencia del par por clase: el ancla de la elasticidad. */
  readonly referenceFares: RoutePrices;
}

/**
 * Calidad de producto a partir de la configuración de cabina y del nivel de
 * servicio. Más espacio por pasajero y más servicio suben la percepción; es la
 * contrapartida de la estrategia de alta densidad.
 */
export function cabinQualityScore(
  seats: SeatsByCabin,
  maxSeats: number,
  serviceLevel: number,
): number {
  const installed = seats.economy + seats.business;
  if (installed === 0 || maxSeats === 0) return 0;

  const densityComfort = 1 - installed / maxSeats;
  const premiumShare = seats.business / installed;
  const service = Math.max(0, Math.min(3, serviceLevel)) / 3;

  return Math.max(0, Math.min(1, 0.45 * densityComfort + 0.25 * premiumShare + 0.3 * service));
}

export function priceFor(option: FlightOption, cabin: keyof RoutePrices): Money {
  return option.prices[cabin];
}
