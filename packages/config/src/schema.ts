import { z } from 'zod';
import type { BalanceConfig } from './types.js';

const positive = z.number().positive();
const nonNegative = z.number().nonnegative();
const unitInterval = z.number().min(0).max(1);

const logitCoefficients = z.object({
  price: z.number().negative(),
  timeOfDay: nonNegative,
  frequency: nonNegative,
  reputation: nonNegative,
  punctuality: nonNegative,
  product: nonNegative,
  loyalty: nonNegative,
  stops: nonNegative,
});

const check = z.object({
  intervalHours: positive,
  durationDays: positive,
  costPerSeatCents: positive.int(),
  conditionRestored: z.number().min(0).max(100),
});

/**
 * Validación en tiempo de ejecución de los parámetros de balance.
 *
 * Los tipos ya los comprueba el compilador; lo que añade el esquema son los
 * rangos y las invariantes cruzadas. Importa porque en Fase 2 los mundos
 * podrán cargar variantes de parámetros desde la base de datos, y un mundo con
 * una elasticidad positiva o una cuota de segmentos que no suma 1 produciría
 * una economía sin sentido en vez de un error.
 */
export const balanceSchema = z
  .object({
    version: z.string().min(1),
    time: z.object({ defaultTimeScale: positive }),
    flight: z.object({
      taxiOutMinutes: nonNegative,
      taxiInMinutes: nonNegative,
      climbDescentPenaltyMinutes: nonNegative,
      routeDistanceFactor: z.number().min(1),
      minimumBlockMinutes: positive,
    }),
    fuel: z.object({
      taxiFuelHoursEquivalent: nonNegative,
      loadWeightFactorBase: positive,
      loadWeightFactorSpan: nonNegative,
      defaultPriceCentsPerKg: positive,
      priceMeanReversion: unitInterval,
      priceSigma: nonNegative,
    }),
    demand: z.object({
      scale: positive,
      sizeExponent: positive,
      shortHaulThresholdKm: positive,
      shortHaulFloor: unitInterval,
      distanceDecayExponent: z.number().negative(),
      domesticMultiplier: positive,
      sameBlocMultiplier: positive,
      differentBlocMultiplier: positive,
      segmentShare: z.object({ business: unitInterval, leisure: unitInterval, vfr: unitInterval }),
      noFlyUtility: z.number(),
      maxRangeKm: positive,
      dayOfWeekProfile: z.object({
        business: z.array(nonNegative).length(7),
        leisure: z.array(nonNegative).length(7),
        vfr: z.array(nonNegative).length(7),
      }),
      peakDepartureHours: z.object({
        business: z.array(z.number().min(0).max(23)).min(1),
        leisure: z.array(z.number().min(0).max(23)).min(1),
        vfr: z.array(z.number().min(0).max(23)).min(1),
      }),
      peakWidthHours: positive,
    }),
    logit: z.object({
      business: logitCoefficients,
      leisure: logitCoefficients,
      vfr: logitCoefficients,
    }),
    fares: z.object({
      baseCents: z.object({ economy: positive.int(), business: positive.int() }),
      perKmCents: z.object({ economy: positive.int(), business: positive.int() }),
      distanceExponent: positive,
      minPriceFactor: positive,
      maxPriceFactor: positive,
    }),
    costs: z.object({
      pilotHourlyCents: positive.int(),
      cabinCrewHourlyCents: positive.int(),
      navFeeCentsPerKm: nonNegative,
      navMtowReferenceKg: positive,
      cateringCentsPerPaxByServiceLevel: z.array(nonNegative.int()).min(1),
      overheadCentsPerAircraftPerDay: nonNegative.int(),
      maintenanceConditionPenaltyMax: z.number().min(1),
    }),
    ancillary: z.object({ centsPerPaxByServiceLevel: z.array(nonNegative.int()).min(1) }),
    fleet: z.object({
      cabinSpaceFactor: z.object({ economy: positive, business: positive }),
      wearPerFlightHour: nonNegative,
      wearPerCycle: nonNegative,
      ageReliabilityOnsetYears: nonNegative,
      ageReliabilityPerYear: nonNegative,
      conditionReliabilityFloor: unitInterval,
      conditionReliabilitySpan: unitInterval,
      deferredCheckPenalty: nonNegative,
      deferGraceFactor: nonNegative,
      checks: z.object({ A: check, B: check, C: check, D: check }),
    }),
    delays: z.object({
      technicalMaxMinutes: nonNegative,
      onTimeThresholdMinutes: positive,
    }),
    reputation: z.object({ initial: z.number(), min: z.number(), max: z.number() }),
  })
  .superRefine((cfg, ctx) => {
    const shareTotal =
      cfg.demand.segmentShare.business +
      cfg.demand.segmentShare.leisure +
      cfg.demand.segmentShare.vfr;
    if (Math.abs(shareTotal - 1) > 1e-9) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['demand', 'segmentShare'],
        message: `Las cuotas de segmento deben sumar 1; suman ${shareTotal}.`,
      });
    }
    if (cfg.fares.minPriceFactor >= cfg.fares.maxPriceFactor) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['fares'],
        message: 'minPriceFactor debe ser menor que maxPriceFactor.',
      });
    }
    if (cfg.reputation.min >= cfg.reputation.max) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['reputation'],
        message: 'min debe ser menor que max.',
      });
    }
    if (cfg.fleet.conditionReliabilityFloor + cfg.fleet.conditionReliabilitySpan > 1 + 1e-9) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['fleet'],
        message: 'conditionReliabilityFloor + conditionReliabilitySpan no puede superar 1.',
      });
    }
    const checks = [cfg.fleet.checks.A, cfg.fleet.checks.B, cfg.fleet.checks.C, cfg.fleet.checks.D];
    for (let i = 1; i < checks.length; i++) {
      const previous = checks[i - 1];
      const current = checks[i];
      if (
        previous !== undefined &&
        current !== undefined &&
        current.intervalHours <= previous.intervalHours
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['fleet', 'checks'],
          message: 'Los intervalos de los checks A→D deben ser crecientes.',
        });
      }
    }
  });

export function validateBalance(config: BalanceConfig): BalanceConfig {
  const result = balanceSchema.safeParse(config);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  · ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Parámetros de balance inválidos (versión ${config.version}):\n${issues}`);
  }
  return config;
}
