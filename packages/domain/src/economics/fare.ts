import { clamp, money, mulMoney, type Money } from '@airline/shared';
import type { BalanceConfig, CabinClass } from '@airline/config';

/**
 * Precio de referencia de una ruta y clase (docs/04 §4.3).
 *
 * No es un tope ni un precio impuesto: es el ancla contra la que el logit mide
 * lo caro o barato que es un billete. La función es cóncava en la distancia
 * (exponente 0,87), de modo que el coste por kilómetro baja en trayectos
 * largos, como ocurre en el mercado real.
 */
export function calculateReferenceFare(
  distanceKm: number,
  cabin: CabinClass,
  config: BalanceConfig,
): Money {
  const base = config.fares.baseCents[cabin];
  const perKm = config.fares.perKmCents[cabin];
  return money(Math.round(base + perKm * distanceKm ** config.fares.distanceExponent));
}

/**
 * Precio efectivo a partir de un factor sobre la referencia.
 *
 * El factor se acota para que no se puedan fijar precios absurdos que rompan
 * el modelo de elección (un billete a un céntimo o a cien veces la referencia
 * no representan decisiones comerciales, sino exploits).
 */
export function calculateFare(
  referenceFare: Money,
  priceFactor: number,
  config: BalanceConfig,
): Money {
  const factor = clamp(priceFactor, config.fares.minPriceFactor, config.fares.maxPriceFactor);
  return mulMoney(referenceFare, factor);
}

/** Cuánto se aparta un precio de la referencia del mercado. */
export function priceFactorOf(price: Money, referenceFare: Money): number {
  if (referenceFare <= 0) return 1;
  return price / referenceFare;
}
