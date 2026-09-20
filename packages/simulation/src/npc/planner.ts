import type { BalanceConfig } from '@airline/config';
import {
  calculateFare,
  calculateFlightDuration,
  calculateDemand,
  calculateReferenceFare,
  calculateRouteProfit,
  canCoverDistance,
  greatCircleDistanceKm,
  occupiedSpace,
  type AircraftType,
  type Airport,
  type CabinConfig,
  type RoutePrices,
} from '@airline/domain';
import type { Instant, Money } from '@airline/shared';
import type { NpcPolicy } from './policies.js';

/**
 * Configuración de cabina que la política quiere instalar en un tipo.
 *
 * Se calcula sobre el espacio disponible, no sobre el número de plazas: una
 * butaca de business ocupa más que una de turista, así que instalar cabina
 * premium cuesta plazas. Es la contrapartida de la estrategia premium.
 */
export function buildCabinConfig(
  policy: NpcPolicy,
  type: AircraftType,
  config: BalanceConfig,
): CabinConfig {
  const usableSpace = type.maxSeats * policy.densityFactor;
  const businessFactor = config.fleet.cabinSpaceFactor.business;

  const businessSeats = Math.floor((usableSpace * policy.businessSeatShare) / businessFactor);
  let economySeats = Math.floor(usableSpace - businessSeats * businessFactor);

  // Ajuste final por si el redondeo se pasa del espacio real del avión.
  while (
    occupiedSpace({ economy: economySeats, business: businessSeats }, config) > type.maxSeats
  ) {
    economySeats -= 1;
  }

  return { economy: Math.max(1, economySeats), business: Math.max(0, businessSeats) };
}

export function buildPrices(
  policy: NpcPolicy,
  distanceKm: number,
  config: BalanceConfig,
): RoutePrices {
  return {
    economy: calculateFare(
      calculateReferenceFare(distanceKm, 'economy', config),
      policy.priceFactor,
      config,
    ),
    business: calculateFare(
      calculateReferenceFare(distanceKm, 'business', config),
      policy.priceFactor,
      config,
    ),
  };
}

export interface RouteCandidate {
  readonly origin: Airport;
  readonly destination: Airport;
  readonly distanceKm: number;
  readonly dailyDemand: number;
  readonly competitors: number;
  /** Ocupación que la política espera conseguir, dada la competencia. */
  readonly expectedLoadFactor: number;
  readonly expectedProfitPerFlight: Money;
  readonly score: number;
}

export interface RankRoutesInput {
  readonly policy: NpcPolicy;
  readonly hub: Airport;
  readonly candidates: readonly Airport[];
  readonly type: AircraftType;
  readonly at: Instant;
  readonly fuelPriceCentsPerKg: number;
  /** Cuántas aerolíneas sirven ya cada par, indexado por "ORIG-DEST". */
  readonly competitorsByPair: ReadonlyMap<string, number>;
}

export function pairKey(origin: string, destination: string): string {
  return `${origin}-${destination}`;
}

/**
 * Ordena destinos candidatos por atractivo para una política.
 *
 * Usa **las mismas funciones** que verá el analizador de rutas del jugador
 * (`calculateDemand`, `calculateRouteProfit`): una NPC no tiene acceso a
 * información privilegiada ni a una economía paralela (ADR-003).
 *
 * Lo que sí es una heurística es la cuota esperada: la NPC no resuelve el
 * logit contra el mercado futuro, sino que reparte la demanda entre los
 * competidores existentes más ella misma. Es una previsión imperfecta, igual
 * que la de un jugador, y a veces se equivoca. Que se equivoque es parte del
 * diseño.
 */
export function rankRouteCandidates(
  input: RankRoutesInput,
  config: BalanceConfig,
): readonly RouteCandidate[] {
  const { policy, hub, type } = input;
  const cabin = buildCabinConfig(policy, type, config);
  const seats = cabin.economy + cabin.business;
  const results: RouteCandidate[] = [];

  for (const destination of input.candidates) {
    if (destination.iata === hub.iata) continue;

    const distanceKm = Math.round(greatCircleDistanceKm(hub, destination));
    if (distanceKm < policy.minRouteDistanceKm || distanceKm > policy.maxRouteDistanceKm) continue;
    if (!canCoverDistance(distanceKm, type, config)) continue;
    if (destination.longestRunwayFt < type.minRunwayFt || hub.longestRunwayFt < type.minRunwayFt)
      continue;

    const demand = calculateDemand(hub, destination, input.at, config);
    if (demand.total <= 0) continue;
    if (policy.maxDailyDemand !== undefined && demand.total > policy.maxDailyDemand) continue;
    if (policy.minDailyDemand !== undefined && demand.total < policy.minDailyDemand) continue;

    const competitors = input.competitorsByPair.get(pairKey(hub.iata, destination.iata)) ?? 0;
    const dailyShare = demand.total / (competitors + 1);
    const flightsPerDay = policy.weeklyFrequency / 7;
    const expectedPax = Math.min(seats, dailyShare / Math.max(flightsPerDay, 0.1));
    const expectedLoadFactor = seats > 0 ? expectedPax / seats : 0;

    const prices = buildPrices(policy, distanceKm, config);
    const businessPax = Math.min(cabin.business, Math.round(expectedPax * 0.08));

    const forecast = calculateRouteProfit(
      {
        type,
        origin: hub,
        destination,
        distanceKm,
        blockMinutes: calculateFlightDuration(distanceKm, type, config),
        seatsOffered: cabin,
        prices,
        pax: { economy: Math.max(0, Math.round(expectedPax) - businessPax), business: businessPax },
        serviceLevel: policy.serviceLevel,
        aircraftCondition: 95,
        fuelPriceCentsPerKg: input.fuelPriceCentsPerKg,
      },
      policy.weeklyFrequency,
      config,
    );

    results.push({
      origin: hub,
      destination,
      distanceKm,
      dailyDemand: demand.total,
      competitors,
      expectedLoadFactor,
      expectedProfitPerFlight: forecast.perFlight.profit,
      score: forecast.perFlight.profit * policy.weeklyFrequency,
    });
  }

  return results.sort((a, b) => b.score - a.score);
}

/**
 * Tipo de avión preferido por la política que pueda operar la distancia.
 *
 * `preferredCategories` está **ordenada**: se recorre por orden y se elige el
 * avión más pequeño de la primera categoría que sirva. Sin respetar el orden,
 * una política que declara ['narrowbody', 'regional'] acabaría siempre en
 * regional por ser el más pequeño, que es justo lo contrario de lo que pide.
 *
 * Dentro de una categoría manda el más pequeño que cubre la distancia: meter
 * capacidad de más es la forma más rápida de hundir la ocupación
 * (docs/04 §4.2).
 */
export function chooseAircraftType(
  policy: NpcPolicy,
  types: readonly AircraftType[],
  distanceKm: number,
  config: BalanceConfig,
): AircraftType | null {
  for (const category of policy.preferredCategories) {
    const usable = types
      .filter((t) => t.category === category && canCoverDistance(distanceKm, t, config))
      .sort((a, b) => a.maxSeats - b.maxSeats);

    const chosen = usable[0];
    if (chosen !== undefined) return chosen;
  }
  return null;
}
