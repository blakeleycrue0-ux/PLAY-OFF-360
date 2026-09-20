import { clamp } from '@airline/shared';
import type { BalanceConfig } from '@airline/config';
import type { Aircraft } from '../entities/aircraft.js';
import { nextCheckFor } from './maintenance.js';

export interface WearOutcome {
  readonly flightHours: number;
  readonly cycles: number;
  readonly condition: number;
  readonly nextCheckType: Aircraft['nextCheckType'];
  readonly nextCheckAtHours: number;
}

/**
 * Desgaste tras un vuelo (docs/03 §3.7).
 *
 * Un ciclo —despegue más aterrizaje— castiga el doble que una hora de vuelo.
 * De ahí sale una consecuencia que el jugador descubre solo: operar muchas
 * rutas cortas desgasta la flota mucho más rápido que volar pocas largas, aun
 * con las mismas horas.
 */
export function applyFlightWear(
  aircraft: Aircraft,
  blockMinutes: number,
  config: BalanceConfig,
): WearOutcome {
  const hours = blockMinutes / 60;
  const flightHours = aircraft.flightHours + hours;
  const wear = hours * config.fleet.wearPerFlightHour + config.fleet.wearPerCycle;
  const condition = clamp(aircraft.condition - wear, 0, 100);

  // El umbral del próximo check no se recalcula si aún no se ha alcanzado:
  // aplazarlo es una decisión del jugador, no un efecto del desgaste.
  const due = aircraft.flightHours >= aircraft.nextCheckAtHours;
  const next = due
    ? { type: aircraft.nextCheckType, atHours: aircraft.nextCheckAtHours }
    : nextCheckAhead(aircraft, flightHours, config);

  return {
    flightHours,
    cycles: aircraft.cycles + 1,
    condition,
    nextCheckType: next.type,
    nextCheckAtHours: next.atHours,
  };
}

function nextCheckAhead(
  aircraft: Aircraft,
  flightHours: number,
  config: BalanceConfig,
): { type: Aircraft['nextCheckType']; atHours: number } {
  if (flightHours < aircraft.nextCheckAtHours) {
    return { type: aircraft.nextCheckType, atHours: aircraft.nextCheckAtHours };
  }
  const next = nextCheckFor(flightHours, config);
  return { type: next.type, atHours: next.atHours };
}
