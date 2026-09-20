import { clamp } from '@airline/shared';
import type { BalanceConfig } from '@airline/config';
import type { Aircraft } from '../entities/aircraft.js';
import type { AircraftType } from '../entities/aircraft-type.js';

/**
 * Fiabilidad efectiva de un avión concreto, 0..1 (docs/03 §3.7).
 *
 * Combina cuatro factores: la fiabilidad de diseño del tipo, el estado físico,
 * la edad y el cumplimiento del programa de mantenimiento. Es la magnitud de
 * la que cuelgan los retrasos técnicos de la Fase 1 y, en fases posteriores,
 * el sistema de riesgo completo.
 */
export function effectiveReliability(
  aircraft: Aircraft,
  type: AircraftType,
  currentYear: number,
  config: BalanceConfig,
): number {
  const {
    conditionReliabilityFloor,
    conditionReliabilitySpan,
    ageReliabilityOnsetYears,
    ageReliabilityPerYear,
    deferredCheckPenalty,
  } = config.fleet;

  const conditionFactor =
    conditionReliabilityFloor +
    conditionReliabilitySpan * (clamp(aircraft.condition, 0, 100) / 100);

  const age = Math.max(0, currentYear - aircraft.builtYear);
  const ageFactor = clamp(
    1 - Math.max(0, age - ageReliabilityOnsetYears) * ageReliabilityPerYear,
    0.6,
    1,
  );

  const complianceFactor = clamp(1 - aircraft.deferredChecks * deferredCheckPenalty, 0.5, 1);

  return clamp(type.baseReliability * conditionFactor * ageFactor * complianceFactor, 0, 1);
}
