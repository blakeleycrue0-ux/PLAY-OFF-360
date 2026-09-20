import { clamp, money, type Money } from '@airline/shared';
import type { BalanceConfig } from '@airline/config';
import type { AircraftType } from '../entities/aircraft-type.js';
import { effectiveDistanceKm } from '../time/block-time.js';

/**
 * Combustible quemado en un vuelo, en kilogramos (docs/03 §3.6).
 *
 * Depende de la ocupación: ir lleno pesa más y consume más. Es lo que hace que
 * llenar el avión a cualquier precio no sea gratis.
 */
export function calculateFuelBurnKg(
  blockMinutes: number,
  type: AircraftType,
  loadFactor: number,
  config: BalanceConfig,
): number {
  const hours = blockMinutes / 60;
  const load = clamp(loadFactor, 0, 1);
  const weightFactor = config.fuel.loadWeightFactorBase + config.fuel.loadWeightFactorSpan * load;
  const taxiFuel = type.fuelBurnKgPerHour * config.fuel.taxiFuelHoursEquivalent;

  return type.fuelBurnKgPerHour * hours * weightFactor + taxiFuel;
}

/**
 * Coste del combustible.
 *
 * El precio es del mundo, no de la aerolínea: cuando sube, sube para todos a
 * la vez (docs/04 §4.5). Es la variable macro que hace que tener flota
 * eficiente sea una estrategia y no un detalle.
 */
export function calculateFuelCost(fuelKg: number, fuelPriceCentsPerKg: number): Money {
  return money(Math.round(fuelKg * fuelPriceCentsPerKg));
}

/** Autonomía utilizable: el alcance nominal no cubre el rodeo de la ruta real. */
export function canCoverDistance(
  distanceKm: number,
  type: AircraftType,
  config: BalanceConfig,
): boolean {
  return effectiveDistanceKm(distanceKm, config) <= type.rangeKm;
}
