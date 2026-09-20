import { money, mulMoney, subMoney, sumMoney, type Money } from '@airline/shared';
import type { BalanceConfig } from '@airline/config';
import { calculateFlightEconomics, type FlightEconomicsInput } from './flight-economics.js';

export interface RouteProfitForecast {
  readonly perFlight: {
    readonly revenue: Money;
    readonly cost: Money;
    readonly profit: Money;
  };
  readonly weekly: { readonly revenue: Money; readonly cost: Money; readonly profit: Money };
  readonly monthly: { readonly revenue: Money; readonly cost: Money; readonly profit: Money };
  readonly loadFactor: number;
  readonly marginPercent: number;
  /** Pasajeros por vuelo a partir de los cuales la ruta deja de perder dinero. */
  readonly breakEvenPax: number;
}

const WEEKS_PER_MONTH = 30 / 7;

/**
 * Rentabilidad prevista de una ruta (docs/07 §7.4).
 *
 * Alimenta dos cosas distintas con la misma función: el analizador de rutas
 * que ve el jugador antes de abrirla, y la decisión de las compañías
 * artificiales. Que ambos usen el mismo cálculo es lo que garantiza que las
 * NPC no juegan con reglas distintas (ADR-003).
 *
 * `breakEvenPax` se obtiene por búsqueda binaria en vez de despejando: el
 * coste no es lineal en el pasaje —el combustible sube con la carga y las
 * tasas por pasajero también—, así que una fórmula cerrada mentiría.
 */
export function calculateRouteProfit(
  input: FlightEconomicsInput,
  weeklyFrequency: number,
  config: BalanceConfig,
): RouteProfitForecast {
  const economics = calculateFlightEconomics(input, config);

  const weekly = {
    revenue: mulMoney(economics.revenue.total, weeklyFrequency),
    cost: mulMoney(economics.cost.total, weeklyFrequency),
    profit: mulMoney(economics.profit, weeklyFrequency),
  };

  const monthly = {
    revenue: mulMoney(economics.revenue.total, weeklyFrequency * WEEKS_PER_MONTH),
    cost: mulMoney(economics.cost.total, weeklyFrequency * WEEKS_PER_MONTH),
    profit: mulMoney(economics.profit, weeklyFrequency * WEEKS_PER_MONTH),
  };

  const marginPercent =
    economics.revenue.total > 0 ? (economics.profit / economics.revenue.total) * 100 : 0;

  return {
    perFlight: {
      revenue: economics.revenue.total,
      cost: economics.cost.total,
      profit: economics.profit,
    },
    weekly,
    monthly,
    loadFactor: economics.loadFactor,
    marginPercent,
    breakEvenPax: findBreakEvenPax(input, config),
  };
}

function findBreakEvenPax(input: FlightEconomicsInput, config: BalanceConfig): number {
  const seats = input.seatsOffered.economy + input.seatsOffered.business;
  if (seats === 0) return 0;

  // Se mantiene la proporción de clases de la configuración de cabina.
  const businessShare = input.seatsOffered.business / seats;

  const profitAt = (pax: number): number => {
    const business = Math.round(pax * businessShare);
    const economy = Math.max(0, pax - business);
    return calculateFlightEconomics(
      { ...input, pax: { economy, business: Math.min(business, input.seatsOffered.business) } },
      config,
    ).profit;
  };

  if (profitAt(seats) < 0) return Number.POSITIVE_INFINITY;

  let low = 0;
  let high = seats;
  while (high - low > 1) {
    const mid = Math.floor((low + high) / 2);
    if (profitAt(mid) >= 0) high = mid;
    else low = mid;
  }
  return high;
}

export interface RouteResults {
  readonly flights: number;
  readonly pax: number;
  readonly revenue: Money;
  readonly cost: Money;
  readonly profit: Money;
  readonly loadFactor: number;
  readonly profitPerFlight: Money;
}

/** Agrega resultados ya liquidados. Es el P&L por ruta de docs/04 §4.9. */
export function aggregateRouteResults(
  flights: readonly {
    readonly pax: number;
    readonly seats: number;
    readonly revenue: Money;
    readonly cost: Money;
  }[],
): RouteResults {
  const revenue = sumMoney(flights.map((f) => f.revenue));
  const cost = sumMoney(flights.map((f) => f.cost));
  const pax = flights.reduce((acc, f) => acc + f.pax, 0);
  const seats = flights.reduce((acc, f) => acc + f.seats, 0);
  const profit = subMoney(revenue, cost);

  return {
    flights: flights.length,
    pax,
    revenue,
    cost,
    profit,
    loadFactor: seats > 0 ? pax / seats : 0,
    profitPerFlight: flights.length > 0 ? money(Math.round(profit / flights.length)) : money(0),
  };
}
