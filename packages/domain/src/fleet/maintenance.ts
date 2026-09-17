import { money, type Money } from '@airline/shared';
import type { BalanceConfig, MaintenanceCheckConfig } from '@airline/config';
import { CHECK_TYPES, type Aircraft, type CheckType } from '../entities/aircraft.js';
import type { AircraftType } from '../entities/aircraft-type.js';

export interface CheckDue {
  readonly type: CheckType;
  readonly atHours: number;
}

function checkConfig(type: CheckType, config: BalanceConfig): MaintenanceCheckConfig {
  return config.fleet.checks[type];
}

/**
 * Próximo check a partir de las horas acumuladas.
 *
 * Cada grado tiene su intervalo; el próximo es el umbral más cercano por
 * delante. Cuando coinciden varios —a las 24.000 h vence A, B, C y D a la
 * vez— manda el de mayor grado, que es lo que ocurre en la realidad: el D
 * absorbe a los demás.
 */
export function nextCheckFor(flightHours: number, config: BalanceConfig): CheckDue {
  let best: CheckDue | null = null;

  for (const type of CHECK_TYPES) {
    const { intervalHours } = checkConfig(type, config);
    const at = Math.ceil((flightHours + 1e-9) / intervalHours) * intervalHours;

    if (
      best === null ||
      at < best.atHours ||
      (at === best.atHours && isHigherGrade(type, best.type))
    ) {
      best = { type, atHours: at };
    }
  }

  // CHECK_TYPES nunca está vacío; el fallback existe sólo para el tipado.
  return best ?? { type: 'A', atHours: config.fleet.checks.A.intervalHours };
}

function isHigherGrade(a: CheckType, b: CheckType): boolean {
  return CHECK_TYPES.indexOf(a) > CHECK_TYPES.indexOf(b);
}

export function isCheckDue(aircraft: Aircraft): boolean {
  return aircraft.flightHours >= aircraft.nextCheckAtHours;
}

/**
 * Coste de un check. Se expresa por asiento en la configuración para que
 * escale entre tipos: revisar un regional de 70 plazas no cuesta lo mismo que
 * un widebody (docs/03 §3.7).
 */
export function checkCost(type: AircraftType, checkType: CheckType, config: BalanceConfig): Money {
  return money(Math.round(checkConfig(checkType, config).costPerSeatCents * type.typicalSeats));
}

export function checkDurationDays(checkType: CheckType, config: BalanceConfig): number {
  return checkConfig(checkType, config).durationDays;
}

export interface MaintenanceOutcome {
  readonly condition: number;
  readonly nextCheckType: CheckType;
  readonly nextCheckAtHours: number;
  readonly deferredChecks: number;
}

/** Aplica un check completado: recupera condición y limpia los aplazamientos. */
export function applyCheck(
  aircraft: Aircraft,
  checkType: CheckType,
  config: BalanceConfig,
): MaintenanceOutcome {
  const restored = checkConfig(checkType, config).conditionRestored;
  const condition = checkType === 'D' ? restored : Math.min(100, aircraft.condition + restored);
  const next = nextCheckFor(aircraft.flightHours, config);

  return {
    condition,
    nextCheckType: next.type,
    nextCheckAtHours: next.atHours,
    deferredChecks: 0,
  };
}

/**
 * Aplaza un check vencido.
 *
 * Es la decisión más interesante del juego (docs/03 §3.7): ahorra dinero hoy y
 * mantiene el avión volando, a cambio de fiabilidad. El coste no es una multa
 * arbitraria: baja `effectiveReliability`, y de ahí salen retrasos técnicos y,
 * en fases posteriores, el riesgo de incidente.
 */
export function deferCheck(aircraft: Aircraft, config: BalanceConfig): MaintenanceOutcome {
  const grace =
    checkConfig(aircraft.nextCheckType, config).intervalHours * config.fleet.deferGraceFactor;

  return {
    condition: aircraft.condition,
    nextCheckType: aircraft.nextCheckType,
    nextCheckAtHours: aircraft.nextCheckAtHours + grace,
    deferredChecks: aircraft.deferredChecks + 1,
  };
}
