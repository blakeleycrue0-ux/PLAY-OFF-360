import { lerp, money, sumMoney, type Money } from '@airline/shared';
import type { BalanceConfig } from '@airline/config';
import type { Airport } from '../entities/airport.js';
import type { AircraftType } from '../entities/aircraft-type.js';
import { effectiveDistanceKm } from '../time/block-time.js';
import { calculateFuelCost } from './fuel.js';

export interface OperatingCostInput {
  readonly type: AircraftType;
  readonly origin: Airport;
  readonly destination: Airport;
  readonly distanceKm: number;
  readonly blockMinutes: number;
  readonly seatsInstalled: number;
  readonly fuelKg: number;
  readonly fuelPriceCentsPerKg: number;
  readonly paxTotal: number;
  readonly serviceLevel: number;
  /** Condición del avión, 0..100: un avión gastado cuesta más de mantener. */
  readonly aircraftCondition: number;
}

/** Desglose por categoría. Cada línea se asienta por separado en el ledger. */
export interface OperatingCost {
  readonly fuel: Money;
  readonly crew: Money;
  readonly maintenance: Money;
  readonly landing: Money;
  readonly passengerFees: Money;
  readonly handling: Money;
  readonly navigation: Money;
  readonly catering: Money;
  readonly total: Money;
}

/** Tripulantes de cabina exigidos por la configuración instalada. */
export function requiredCabinCrew(seatsInstalled: number, type: AircraftType): number {
  return Math.max(1, Math.ceil((seatsInstalled / 50) * type.cabinCrewPer50Seats));
}

/** Un avión en mal estado consume más horas de taller por hora de vuelo. */
function conditionPenalty(condition: number, config: BalanceConfig): number {
  return lerp(
    config.costs.maintenanceConditionPenaltyMax,
    1,
    Math.max(0, Math.min(100, condition)) / 100,
  );
}

function indexed(values: readonly number[], index: number): number {
  const clamped = Math.max(0, Math.min(values.length - 1, Math.round(index)));
  return values[clamped] ?? 0;
}

/**
 * Coste operativo de un vuelo (docs/04 §4.4).
 *
 * Todo lo que aquí aparece es coste variable por vuelo. Los costes fijos que
 * se pagan vuele o no vuele el avión —leasing, nómina, overhead, seguros— no
 * están aquí: se asientan en los cierres diario y mensual, que es exactamente
 * lo que permite tener muchos aviones y perder dinero.
 */
export function calculateOperatingCost(
  input: OperatingCostInput,
  config: BalanceConfig,
): OperatingCost {
  const hours = input.blockMinutes / 60;
  const { type } = input;

  const fuel = calculateFuelCost(input.fuelKg, input.fuelPriceCentsPerKg);

  const cabinCrew = requiredCabinCrew(input.seatsInstalled, type);
  const crew = money(
    Math.round(
      (type.crewCockpit * config.costs.pilotHourlyCents +
        cabinCrew * config.costs.cabinCrewHourlyCents) *
        hours,
    ),
  );

  const maintenance = money(
    Math.round(type.maintCostHourCents * hours * conditionPenalty(input.aircraftCondition, config)),
  );

  const landing = money(
    Math.round(input.destination.landingFeeCentsPerTonne * (type.mtowKg / 1000)),
  );

  const passengerFees = money(
    Math.round(input.paxTotal * (input.origin.paxFeeCents + input.destination.paxFeeCents)),
  );

  const handling = money(input.origin.handlingFeeCents + input.destination.handlingFeeCents);

  const navigation = money(
    Math.round(
      effectiveDistanceKm(input.distanceKm, config) *
        config.costs.navFeeCentsPerKm *
        Math.sqrt(type.mtowKg / config.costs.navMtowReferenceKg),
    ),
  );

  const catering = money(
    Math.round(
      input.paxTotal * indexed(config.costs.cateringCentsPerPaxByServiceLevel, input.serviceLevel),
    ),
  );

  return {
    fuel,
    crew,
    maintenance,
    landing,
    passengerFees,
    handling,
    navigation,
    catering,
    total: sumMoney([
      fuel,
      crew,
      maintenance,
      landing,
      passengerFees,
      handling,
      navigation,
      catering,
    ]),
  };
}

/** Coste fijo diario imputable a un avión, opere o no (docs/04 §4.4). */
export function calculateDailyFixedCost(
  leaseRate: Money | null,
  config: BalanceConfig,
): { readonly lease: Money; readonly overhead: Money; readonly total: Money } {
  // El leasing es mensual; se imputa a días con un mes contable de 30 días.
  const lease = leaseRate === null ? money(0) : money(Math.round(leaseRate / 30));
  const overhead = money(config.costs.overheadCentsPerAircraftPerDay);
  return { lease, overhead, total: sumMoney([lease, overhead]) };
}
