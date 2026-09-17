import { clamp, type Instant } from '@airline/shared';
import {
  DEMAND_SEGMENTS,
  type BalanceConfig,
  type BySegment,
  type DemandSegment,
} from '@airline/config';
import type { Airport } from '../entities/airport.js';
import { greatCircleDistanceKm } from '../geo/distance.js';
import { dayOfWeekFactor, seasonalityFor } from './seasonality.js';

export type DemandBySegment = BySegment<number>;

export interface DemandBreakdown {
  readonly total: number;
  readonly bySegment: DemandBySegment;
  readonly distanceKm: number;
  /** Factores aplicados, para poder explicarle al jugador de dónde sale la cifra. */
  readonly factors: {
    readonly size: number;
    readonly distanceDecay: number;
    readonly domestic: number;
    readonly bloc: number;
    readonly seasonality: number;
  };
}

/**
 * Demanda diaria de un par origen-destino: modelo de gravedad (docs/04 §4.1).
 *
 * El tráfico entre dos ciudades crece con su tamaño y decae con la distancia.
 * Es el modelo que usa la planificación aeronáutica real, y es demanda **del
 * mercado**, no de una aerolínea: existe la sirva quien la sirva, o no la
 * sirva nadie. El reparto entre competidores es un paso aparte
 * (`allocateDemand`), y esa separación es justamente lo que impide que meter
 * más aviones cree pasajeros.
 *
 * Limitación conocida de la Fase 1: docs/04 incluye además un factor de
 * afinidad lingüística o cultural (ES↔AR, UK↔IE). No hay datos para
 * sostenerlo, así que **no se aplica** en vez de inventarlo; queda registrado
 * como pendiente C-9 en docs/decisions.md.
 */
export function calculateDemand(
  origin: Airport,
  destination: Airport,
  at: Instant,
  config: BalanceConfig,
): DemandBreakdown {
  const distanceKm = greatCircleDistanceKm(origin, destination);
  const cfg = config.demand;

  if (distanceKm > cfg.maxRangeKm || distanceKm <= 0) {
    return emptyDemand(distanceKm);
  }

  const size =
    origin.marketWeight ** cfg.sizeExponent * destination.marketWeight ** cfg.sizeExponent;

  // Muy corto: el avión no compite con el coche ni con el tren.
  // A partir del umbral, decaimiento potencial clásico del modelo de gravedad.
  const distanceDecay =
    distanceKm < cfg.shortHaulThresholdKm
      ? cfg.shortHaulFloor + (1 - cfg.shortHaulFloor) * (distanceKm / cfg.shortHaulThresholdKm)
      : (distanceKm / 1000) ** cfg.distanceDecayExponent;

  const domestic = origin.country === destination.country ? cfg.domesticMultiplier : 1;
  const bloc =
    origin.schengen && destination.schengen ? cfg.sameBlocMultiplier : cfg.differentBlocMultiplier;
  const seasonality = seasonalityFor(origin, destination, at);

  const daily = cfg.scale * size * distanceDecay * domestic * bloc * seasonality;

  const bySegment = {} as Record<DemandSegment, number>;
  for (const segment of DEMAND_SEGMENTS) {
    const segmentAffinity = affinityFor(segment, origin, destination);
    bySegment[segment] = Math.max(
      0,
      daily * cfg.segmentShare[segment] * segmentAffinity * dayOfWeekFactor(segment, at, config),
    );
  }

  return {
    total: bySegment.business + bySegment.leisure + bySegment.vfr,
    bySegment,
    distanceKm,
    factors: { size, distanceDecay, domestic, bloc, seasonality },
  };
}

/**
 * Un par con dos aeropuertos de negocios genera más tráfico business; uno con
 * un destino turístico, más ocio. Los índices vienen del conjunto de datos y
 * son provisionales (pendiente C-6).
 */
function affinityFor(segment: DemandSegment, origin: Airport, destination: Airport): number {
  switch (segment) {
    case 'business':
      return clamp(2 * Math.sqrt(origin.businessIndex * destination.businessIndex), 0.15, 2);
    case 'leisure':
      return clamp(2 * Math.sqrt(origin.leisureIndex * destination.leisureIndex), 0.15, 2);
    case 'vfr':
      return 1;
  }
}

function emptyDemand(distanceKm: number): DemandBreakdown {
  return {
    total: 0,
    bySegment: { business: 0, leisure: 0, vfr: 0 },
    distanceKm,
    factors: { size: 0, distanceDecay: 0, domestic: 1, bloc: 1, seasonality: 1 },
  };
}
