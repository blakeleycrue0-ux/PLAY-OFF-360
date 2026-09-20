/** Segmentos de demanda (docs/04 §4.1). Cada uno reacciona distinto al precio. */
export const DEMAND_SEGMENTS = ['business', 'leisure', 'vfr'] as const;
export type DemandSegment = (typeof DEMAND_SEGMENTS)[number];

/** Clases de cabina de la Fase 1 (docs/08: economy + business). */
export const CABIN_CLASSES = ['economy', 'business'] as const;
export type CabinClass = (typeof CABIN_CLASSES)[number];

export type ByCabin<T> = Readonly<Record<CabinClass, T>>;
export type BySegment<T> = Readonly<Record<DemandSegment, T>>;

/** Coeficientes de utilidad del logit multinomial (docs/04 §4.2). */
export interface LogitCoefficients {
  /** Sensibilidad al precio relativo. Negativo. */
  readonly price: number;
  /** Valor de salir a una hora conveniente para el segmento. */
  readonly timeOfDay: number;
  /** Valor de la frecuencia, con rendimiento decreciente (entra como log). */
  readonly frequency: number;
  readonly reputation: number;
  readonly punctuality: number;
  /** Calidad de producto percibida: configuración de cabina y nivel de servicio. */
  readonly product: number;
  /** Ventaja del operador establecido en el aeropuerto de origen. */
  readonly loyalty: number;
  /** Penalización por escala. Se aplica por cada escala del itinerario. */
  readonly stops: number;
}

export interface MaintenanceCheckConfig {
  readonly intervalHours: number;
  readonly durationDays: number;
  readonly costPerSeatCents: number;
  readonly conditionRestored: number;
}

export interface BalanceConfig {
  readonly version: string;

  readonly time: {
    readonly defaultTimeScale: number;
  };

  readonly flight: {
    readonly taxiOutMinutes: number;
    readonly taxiInMinutes: number;
    readonly climbDescentPenaltyMinutes: number;
    /** Factor de rodeo: la ruta real es más larga que el círculo máximo. */
    readonly routeDistanceFactor: number;
    readonly minimumBlockMinutes: number;
  };

  readonly fuel: {
    readonly taxiFuelHoursEquivalent: number;
    readonly loadWeightFactorBase: number;
    readonly loadWeightFactorSpan: number;
    readonly defaultPriceCentsPerKg: number;
    readonly priceMeanReversion: number;
    readonly priceSigma: number;
  };

  readonly demand: {
    readonly scale: number;
    readonly sizeExponent: number;
    readonly shortHaulThresholdKm: number;
    readonly shortHaulFloor: number;
    readonly distanceDecayExponent: number;
    readonly domesticMultiplier: number;
    readonly sameBlocMultiplier: number;
    readonly differentBlocMultiplier: number;
    readonly segmentShare: BySegment<number>;
    /** Utilidad de la opción "no volar". Ancla el denominador del logit. */
    readonly noFlyUtility: number;
    readonly maxRangeKm: number;
    /** Perfil semanal de demanda por segmento: siete multiplicadores, de domingo a sábado. */
    readonly dayOfWeekProfile: BySegment<readonly number[]>;
    /** Horas de salida preferidas por cada segmento, en hora local del origen. */
    readonly peakDepartureHours: BySegment<readonly number[]>;
    /** Anchura del pico horario, en horas: cuánto se tolera alejarse del óptimo. */
    readonly peakWidthHours: number;
  };

  readonly logit: BySegment<LogitCoefficients>;

  readonly fares: {
    readonly baseCents: ByCabin<number>;
    readonly perKmCents: ByCabin<number>;
    readonly distanceExponent: number;
    /** Multiplicador máximo y mínimo aceptado sobre el precio de referencia. */
    readonly minPriceFactor: number;
    readonly maxPriceFactor: number;
  };

  readonly costs: {
    readonly pilotHourlyCents: number;
    readonly cabinCrewHourlyCents: number;
    readonly navFeeCentsPerKm: number;
    readonly navMtowReferenceKg: number;
    readonly cateringCentsPerPaxByServiceLevel: readonly number[];
    readonly overheadCentsPerAircraftPerDay: number;
    /** Penalización de coste de mantenimiento por avión en mal estado. */
    readonly maintenanceConditionPenaltyMax: number;
  };

  readonly ancillary: {
    readonly centsPerPaxByServiceLevel: readonly number[];
  };

  readonly fleet: {
    /**
     * Espacio que ocupa una plaza de cada clase, en unidades de plaza de
     * turista. Gobierna qué configuraciones de cabina caben en un tipo.
     */
    readonly cabinSpaceFactor: ByCabin<number>;
    readonly wearPerFlightHour: number;
    readonly wearPerCycle: number;
    readonly ageReliabilityOnsetYears: number;
    readonly ageReliabilityPerYear: number;
    readonly conditionReliabilityFloor: number;
    readonly conditionReliabilitySpan: number;
    readonly deferredCheckPenalty: number;
    /** Margen de horas extra que gana un check al aplazarlo, como fracción de su intervalo. */
    readonly deferGraceFactor: number;
    readonly checks: Readonly<Record<'A' | 'B' | 'C' | 'D', MaintenanceCheckConfig>>;
  };

  readonly delays: {
    /** Retraso técnico máximo, en minutos, con el avión en el peor estado. */
    readonly technicalMaxMinutes: number;
    readonly onTimeThresholdMinutes: number;
  };

  readonly reputation: {
    readonly initial: number;
    readonly min: number;
    readonly max: number;
    /** Peso del último vuelo en la media móvil de puntualidad. */
    readonly onTimeSmoothing: number;
    /** Velocidad a la que la reputación persigue a la puntualidad. */
    readonly smoothing: number;
  };
}
