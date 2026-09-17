import { money, mulMoney, subMoney, sumMoney, type Money } from '@airline/shared';
import type { BalanceConfig } from '@airline/config';
import type { Airport } from '../entities/airport.js';
import type { AircraftType } from '../entities/aircraft-type.js';
import type { PaxByCabin, SeatsByCabin } from '../entities/flight.js';
import type { RoutePrices } from '../entities/route.js';
import { totalSeats } from '../entities/cabin.js';
import { totalPax } from '../entities/flight.js';
import { calculateFuelBurnKg } from './fuel.js';
import { calculateOperatingCost, type OperatingCost } from './operating-cost.js';

export interface FlightRevenue {
  readonly tickets: Money;
  readonly ancillary: Money;
  readonly total: Money;
}

export interface FlightEconomics {
  readonly revenue: FlightRevenue;
  readonly cost: OperatingCost;
  readonly profit: Money;
  readonly loadFactor: number;
  readonly fuelKg: number;
  readonly paxTotal: number;
}

export interface FlightEconomicsInput {
  readonly type: AircraftType;
  readonly origin: Airport;
  readonly destination: Airport;
  readonly distanceKm: number;
  readonly blockMinutes: number;
  readonly seatsOffered: SeatsByCabin;
  readonly prices: RoutePrices;
  readonly pax: PaxByCabin;
  readonly serviceLevel: number;
  readonly aircraftCondition: number;
  readonly fuelPriceCentsPerKg: number;
}

function indexed(values: readonly number[], index: number): number {
  const clamped = Math.max(0, Math.min(values.length - 1, Math.round(index)));
  return values[clamped] ?? 0;
}

/**
 * Economía completa de un vuelo: ingresos, costes y resultado.
 *
 * Es la función central del juego y es **pura**: el worker la usa para
 * liquidar de verdad y el cliente para previsualizar una ruta antes de
 * abrirla, sin una llamada de red por cada movimiento de un deslizador
 * (docs/01 §1.4). Al ejecutarse una sola implementación en los dos sitios, la
 * previsión no puede prometer un beneficio que la liquidación no dé.
 */
export function calculateFlightEconomics(
  input: FlightEconomicsInput,
  config: BalanceConfig,
): FlightEconomics {
  const seatsInstalled = totalSeats(input.seatsOffered);
  const paxTotal = totalPax(input.pax);
  const loadFactor = seatsInstalled > 0 ? paxTotal / seatsInstalled : 0;

  const fuelKg = calculateFuelBurnKg(input.blockMinutes, input.type, loadFactor, config);

  const tickets = sumMoney([
    mulMoney(input.prices.economy, input.pax.economy),
    mulMoney(input.prices.business, input.pax.business),
  ]);

  // Los extras compensan tarifas bajas: es lo que hace del bajo coste una
  // estrategia de verdad y no sólo un adjetivo (docs/04 §4.3).
  const ancillary = money(
    Math.round(paxTotal * indexed(config.ancillary.centsPerPaxByServiceLevel, input.serviceLevel)),
  );

  const revenue: FlightRevenue = { tickets, ancillary, total: sumMoney([tickets, ancillary]) };

  const cost = calculateOperatingCost(
    {
      type: input.type,
      origin: input.origin,
      destination: input.destination,
      distanceKm: input.distanceKm,
      blockMinutes: input.blockMinutes,
      seatsInstalled,
      fuelKg,
      fuelPriceCentsPerKg: input.fuelPriceCentsPerKg,
      paxTotal,
      serviceLevel: input.serviceLevel,
      aircraftCondition: input.aircraftCondition,
    },
    config,
  );

  return {
    revenue,
    cost,
    profit: subMoney(revenue.total, cost.total),
    loadFactor,
    fuelKg,
    paxTotal,
  };
}
