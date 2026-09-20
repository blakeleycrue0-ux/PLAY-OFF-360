import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { aircraftTypesRepo, airportsRepo, findMarketOffers, worldsRepo } from '@airline/db';
import {
  allocateDemand,
  calculateDemand,
  calculateFlightDuration,
  calculateReferenceFare,
  calculateRouteProfit,
  cabinQualityScore,
  canCoverDistance,
  greatCircleDistanceKm,
  totalSeats,
  weeklyFrequency,
  type AircraftType,
  type Airport,
  type DemandBreakdown,
  type FlightOption,
  type PaxByCabin,
  type RouteProfitForecast,
  type RoutePrices,
  type SeatsByCabin,
} from '@airline/domain';
import {
  addDays,
  aircraftTypeCode,
  airportCode,
  minutes,
  mulMoney,
  startOfUtcDay,
  toEuros,
  worldId as toWorldId,
  type Money,
} from '@airline/shared';
import { marketContextFor, toFlightOption } from '@airline/simulation';
import type { MarketOffer } from '@airline/db';
import type { ApiContext } from '../context.js';

const querySchema = z.object({
  world: z.string().uuid(),
  origin: z.string().length(3),
  destination: z.string().length(3),
  aircraftType: z.string().min(3),
  priceFactor: z.coerce.number().min(0.3).max(4).default(1),
  serviceLevel: z.coerce.number().int().min(0).max(3).default(2),
  weeklyFrequency: z.coerce.number().int().min(1).max(21).default(7),
  departureHourUtc: z.coerce.number().int().min(0).max(23).default(8),
});

/**
 * El analizador de rutas (docs/07 §7.4).
 *
 * Es el endpoint que justifica que el dominio sea TypeScript puro: responde
 * ejecutando exactamente las mismas funciones que el cliente puede ejecutar en
 * el dispositivo mientras el jugador mueve un deslizador. El servidor es la
 * autoridad; el cliente, la vista previa. No hay dos implementaciones que
 * puedan desincronizarse (docs/01 §1.4).
 */
export function registerRouteAnalysisRoutes(app: FastifyInstance, ctx: ApiContext): void {
  app.get('/route-analysis', async (request, reply) => {
    const parsed = querySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid_query', issues: parsed.error.issues });
    }
    const query = parsed.data;

    const loaded = await loadAnalysisTargets(ctx, query);
    if ('error' in loaded) return reply.code(loaded.status).send(loaded.error);

    const { world, origin, destination, type, distanceKm } = loaded;
    const now = ctx.clock.now();
    const demand = calculateDemand(origin, destination, now, ctx.config);

    const dayStart = startOfUtcDay(now);
    const competitors = await findMarketOffers(
      ctx.pool,
      world.id,
      origin.iata,
      destination.iata,
      dayStart,
      addDays(dayStart, 1),
    );

    const { cabin, prices, candidate } = buildCandidateOffer(ctx, query, type, origin, distanceKm);

    const allocation = allocateDemand(
      [candidate, ...competitors.map(toFlightOption)],
      demand.bySegment,
      marketContextFor(distanceKm, ctx.config),
      ctx.config,
    );

    const expected = allocation.byOption.get('candidate')?.pax ?? { economy: 0, business: 0 };
    const blockMinutes = calculateFlightDuration(distanceKm, type, ctx.config);

    const forecast = calculateRouteProfit(
      {
        type,
        origin,
        destination,
        distanceKm,
        blockMinutes,
        seatsOffered: cabin,
        prices,
        pax: expected,
        serviceLevel: query.serviceLevel,
        aircraftCondition: 95,
        fuelPriceCentsPerKg: world.fuelPriceCentsPerKg,
      },
      query.weeklyFrequency,
      ctx.config,
    );

    return buildAnalysisResponse({
      origin,
      destination,
      distanceKm,
      blockMinutes,
      demand,
      competitors,
      type,
      cabin,
      prices,
      expected,
      forecast,
      weeklyFrequency: query.weeklyFrequency,
      referenceFare: calculateReferenceFare(distanceKm, 'economy', ctx.config),
    });
  });
}

/**
 * La oferta hipotética que el jugador está evaluando, lista para entrar en el
 * modelo de elección junto a la competencia real.
 */
function buildCandidateOffer(
  ctx: ApiContext,
  query: z.infer<typeof querySchema>,
  type: AircraftType,
  origin: Airport,
  distanceKm: number,
): { cabin: SeatsByCabin; prices: RoutePrices; candidate: FlightOption } {
  const cabin = {
    economy: Math.round(type.typicalSeats * 0.95),
    business: Math.round(type.typicalSeats * 0.05),
  };

  const prices = {
    economy: mulMoney(calculateReferenceFare(distanceKm, 'economy', ctx.config), query.priceFactor),
    business: mulMoney(
      calculateReferenceFare(distanceKm, 'business', ctx.config),
      query.priceFactor,
    ),
  };

  return {
    cabin,
    prices,
    candidate: {
      key: 'candidate',
      airlineId: 'candidate' as FlightOption['airlineId'],
      prices,
      seats: cabin,
      departureMinuteUtc: minutes(query.departureHourUtc * 60),
      originUtcOffsetMinutes: origin.utcOffsetMinutes,
      weeklyFrequency: query.weeklyFrequency,
      reputation: 50,
      onTimeRate: 85,
      productScore: cabinQualityScore(cabin, type.maxSeats, query.serviceLevel),
      loyalty: 0,
      stops: 0,
    },
  };
}

type AnalysisTargets =
  | {
      readonly world: NonNullable<Awaited<ReturnType<typeof worldsRepo.findWorld>>>;
      readonly origin: Airport;
      readonly destination: Airport;
      readonly type: AircraftType;
      readonly distanceKm: number;
    }
  | { readonly status: number; readonly error: Record<string, unknown> };

/** Carga y valida mundo, aeropuertos y tipo de avión antes de analizar nada. */
async function loadAnalysisTargets(
  ctx: ApiContext,
  query: z.infer<typeof querySchema>,
): Promise<AnalysisTargets> {
  const world = await worldsRepo.findWorld(ctx.pool, toWorldId(query.world));
  if (world === null) return { status: 404, error: { error: 'world_not_found' } };

  const [origin, destination] = await Promise.all([
    airportsRepo.findAirport(ctx.pool, airportCode(query.origin)),
    airportsRepo.findAirport(ctx.pool, airportCode(query.destination)),
  ]);
  if (origin === null || destination === null) {
    return { status: 404, error: { error: 'airport_not_found' } };
  }

  const type = await aircraftTypesRepo.findAircraftType(
    ctx.pool,
    aircraftTypeCode(query.aircraftType),
  );
  if (type === null) return { status: 404, error: { error: 'aircraft_type_not_found' } };

  const distanceKm = Math.round(greatCircleDistanceKm(origin, destination));
  if (!canCoverDistance(distanceKm, type, ctx.config)) {
    return {
      status: 422,
      error: {
        error: 'insufficient_range',
        distanceKm,
        rangeKm: type.rangeKm,
        message: `El ${type.name} no alcanza: la ruta exige ${distanceKm} km y su alcance es de ${type.rangeKm} km.`,
      },
    };
  }

  return { world, origin, destination, type, distanceKm };
}

interface AnalysisInput {
  readonly origin: Airport;
  readonly destination: Airport;
  readonly distanceKm: number;
  readonly blockMinutes: number;
  readonly demand: DemandBreakdown;
  readonly competitors: readonly MarketOffer[];
  readonly type: AircraftType;
  readonly cabin: SeatsByCabin;
  readonly prices: RoutePrices;
  readonly expected: PaxByCabin;
  readonly forecast: RouteProfitForecast;
  readonly weeklyFrequency: number;
  readonly referenceFare: Money;
}

function competitionSummary(competitors: readonly MarketOffer[]): {
  airlines: number;
  dailyFlights: number;
  dailySeats: number;
  averageWeeklyFrequency: number;
} {
  const totalFrequency = competitors.reduce(
    (acc, c) => acc + (c.scheduleDaysOfWeek > 0 ? countDays(c.scheduleDaysOfWeek) : 1),
    0,
  );

  return {
    airlines: new Set(competitors.map((c) => c.airlineId)).size,
    dailyFlights: competitors.length,
    dailySeats: competitors.reduce((acc, c) => acc + c.seats.economy + c.seats.business, 0),
    averageWeeklyFrequency:
      competitors.length === 0 ? 0 : Math.round(totalFrequency / competitors.length),
  };
}

function buildAnalysisResponse(input: AnalysisInput): Record<string, unknown> {
  return {
    route: {
      origin: input.origin.iata,
      destination: input.destination.iata,
      distanceKm: input.distanceKm,
      blockMinutes: input.blockMinutes,
    },
    demand: {
      dailyTotal: Math.round(input.demand.total),
      bySegment: {
        business: Math.round(input.demand.bySegment.business),
        leisure: Math.round(input.demand.bySegment.leisure),
        vfr: Math.round(input.demand.bySegment.vfr),
      },
      seasonalityFactor: Math.round(input.demand.factors.seasonality * 100) / 100,
    },
    competition: competitionSummary(input.competitors),
    proposal: {
      aircraftType: input.type.name,
      seats: totalSeats(input.cabin),
      priceEconomyEur: toEuros(input.prices.economy),
      priceBusinessEur: toEuros(input.prices.business),
      referenceFareEur: toEuros(input.referenceFare),
      weeklyFrequency: input.weeklyFrequency,
    },
    forecast: {
      expectedPax: input.expected.economy + input.expected.business,
      expectedLoadFactor: Math.round(input.forecast.loadFactor * 1000) / 10,
      breakEvenPax: input.forecast.breakEvenPax,
      profitPerFlightEur: toEuros(input.forecast.perFlight.profit),
      revenuePerFlightEur: toEuros(input.forecast.perFlight.revenue),
      costPerFlightEur: toEuros(input.forecast.perFlight.cost),
      monthlyProfitEur: toEuros(input.forecast.monthly.profit),
      marginPercent: Math.round(input.forecast.marginPercent * 10) / 10,
    },
  };
}

/** Frecuencias semanales que declara una máscara de días. */
function countDays(mask: number): number {
  return weeklyFrequency({ daysOfWeek: mask } as Parameters<typeof weeklyFrequency>[0]);
}
