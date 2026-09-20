import type { BalanceConfig } from '@airline/config';
import {
  cabinQualityScore,
  calculateReferenceFare,
  weeklyFrequency,
  type FlightOption,
  type MarketContext,
} from '@airline/domain';
import type { MarketOffer } from '@airline/db';

/**
 * Convierte las ofertas que devuelve la base en opciones del modelo de
 * elección. Vive aquí, en el motor, porque es donde se juntan la consulta
 * (infraestructura) y las reglas (dominio): ninguno de los dos lados debe
 * conocer al otro.
 */
export function toFlightOption(offer: MarketOffer): FlightOption {
  const maxSeats = offer.maxSeats > 0 ? offer.maxSeats : offer.seats.economy + offer.seats.business;

  return {
    key: offer.flightId,
    airlineId: offer.airlineId,
    prices: offer.prices,
    seats: offer.seats,
    departureMinuteUtc: offer.departureMinuteUtc,
    originUtcOffsetMinutes: offer.originUtcOffsetMinutes,
    // Una plantilla de siete días es una frecuencia diaria. Un vuelo suelto,
    // sin plantilla detrás, cuenta como frecuencia 1.
    weeklyFrequency:
      offer.scheduleDaysOfWeek > 0
        ? weeklyFrequency({ daysOfWeek: offer.scheduleDaysOfWeek } as Parameters<
            typeof weeklyFrequency
          >[0])
        : 1,
    reputation: offer.reputation,
    onTimeRate: offer.onTimeRate,
    productScore: cabinQualityScore(offer.seats, maxSeats, offer.serviceLevel),
    loyalty: offer.operatesFromHub ? 1 : 0,
    stops: 0,
  };
}

export function marketContextFor(distanceKm: number, config: BalanceConfig): MarketContext {
  return {
    referenceFares: {
      economy: calculateReferenceFare(distanceKm, 'economy', config),
      business: calculateReferenceFare(distanceKm, 'business', config),
    },
  };
}
