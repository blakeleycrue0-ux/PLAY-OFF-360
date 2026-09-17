import type { BalanceConfig } from './types.js';

/**
 * Parámetros de balance del mundo por defecto.
 *
 * Ningún número del juego se escribe en el código: todo vive aquí y se carga
 * por mundo a través de `worlds.config_version` (docs/01 §1.7).
 *
 * **Cada hoja de este objeto tiene una entrada obligatoria en
 * `PARAMETER_PROVENANCE`** (`provenance.ts`), que declara si el valor procede
 * de los documentos de diseño, si se deriva de ellos con una regla explícita,
 * o si es provisional y está pendiente de calibrar. Un test impide añadir un
 * parámetro sin declarar su procedencia: es la garantía de que no se cuela una
 * fórmula económica inventada en silencio.
 */
export const DEFAULT_BALANCE: BalanceConfig = {
  version: '2026.09-phase1',

  time: {
    defaultTimeScale: 1,
  },

  flight: {
    taxiOutMinutes: 12,
    taxiInMinutes: 7,
    climbDescentPenaltyMinutes: 14,
    routeDistanceFactor: 1.06,
    minimumBlockMinutes: 35,
  },

  fuel: {
    taxiFuelHoursEquivalent: 0.2,
    loadWeightFactorBase: 0.82,
    loadWeightFactorSpan: 0.18,
    defaultPriceCentsPerKg: 92,
    priceMeanReversion: 0.94,
    priceSigma: 0.02,
  },

  demand: {
    scale: 0.055,
    sizeExponent: 0.68,
    shortHaulThresholdKm: 350,
    shortHaulFloor: 0.25,
    distanceDecayExponent: -0.42,
    domesticMultiplier: 1.35,
    sameBlocMultiplier: 1.18,
    differentBlocMultiplier: 0.88,
    segmentShare: { business: 0.22, leisure: 0.55, vfr: 0.23 },
    noFlyUtility: -2,
    maxRangeKm: 12_000,
  },

  logit: {
    business: {
      price: -0.8,
      timeOfDay: 1.4,
      frequency: 0.9,
      reputation: 0.8,
      punctuality: 1.1,
      product: 0.7,
      loyalty: 0.5,
      stops: 1.2,
    },
    leisure: {
      price: -1.9,
      timeOfDay: 0.4,
      frequency: 0.25,
      reputation: 0.45,
      punctuality: 0.3,
      product: 0.35,
      loyalty: 0.25,
      stops: 0.9,
    },
    vfr: {
      price: -1.5,
      timeOfDay: 0.25,
      frequency: 0.2,
      reputation: 0.3,
      punctuality: 0.25,
      product: 0.2,
      loyalty: 0.2,
      stops: 0.8,
    },
  },

  fares: {
    baseCents: { economy: 3_000, business: 8_000 },
    perKmCents: { economy: 12, business: 32 },
    distanceExponent: 0.87,
    minPriceFactor: 0.3,
    maxPriceFactor: 4,
  },

  costs: {
    pilotHourlyCents: 26_000,
    cabinCrewHourlyCents: 13_000,
    navFeeCentsPerKm: 65,
    navMtowReferenceKg: 50_000,
    cateringCentsPerPaxByServiceLevel: [0, 150, 350, 700],
    overheadCentsPerAircraftPerDay: 83_300,
    maintenanceConditionPenaltyMax: 1.6,
  },

  ancillary: {
    centsPerPaxByServiceLevel: [2_500, 1_200, 540, 250],
  },

  fleet: {
    wearPerFlightHour: 0.01,
    wearPerCycle: 0.02,
    ageReliabilityOnsetYears: 15,
    ageReliabilityPerYear: 0.004,
    conditionReliabilityFloor: 0.72,
    conditionReliabilitySpan: 0.28,
    deferredCheckPenalty: 0.06,
    checks: {
      A: { intervalHours: 600, durationDays: 1, costPerSeatCents: 6_670, conditionRestored: 8 },
      B: { intervalHours: 3_000, durationDays: 3, costPerSeatCents: 25_000, conditionRestored: 20 },
      C: { intervalHours: 12_000, durationDays: 14, costPerSeatCents: 211_100, conditionRestored: 45 },
      D: { intervalHours: 24_000, durationDays: 45, costPerSeatCents: 1_166_700, conditionRestored: 95 },
    },
  },

  delays: {
    technicalMaxMinutes: 45,
    technicalConditionThreshold: 60,
    onTimeThresholdMinutes: 15,
  },

  reputation: {
    initial: 50,
    min: 0,
    max: 100,
  },
};
