import type { FastifyInstance } from 'fastify';
import { airlineSummaries, airlinesRepo, worldsRepo, worldTotals } from '@airline/db';
import { addDays, toEuros, toISO, worldId as toWorldId } from '@airline/shared';
import type { ApiContext } from '../context.js';

export function registerWorldRoutes(app: FastifyInstance, ctx: ApiContext): void {
  app.get('/worlds', async () => {
    const worlds = await worldsRepo.listOpenWorlds(ctx.pool);
    return worlds.map((world) => ({
      id: world.id,
      name: world.name,
      startedAt: toISO(world.startedAt),
      timeScale: world.timeScale,
      fuelPriceEurPerKg: world.fuelPriceCentsPerKg / 100,
      status: world.status,
    }));
  });

  app.get<{ Params: { id: string } }>('/worlds/:id', async (request, reply) => {
    const world = await worldsRepo.findWorld(ctx.pool, toWorldId(request.params.id));
    if (world === null) return reply.code(404).send({ error: 'world_not_found' });

    const now = ctx.clock.now();
    const totals = await worldTotals(ctx.pool, world.id, addDays(now, -1), addDays(now, 1));

    return {
      id: world.id,
      name: world.name,
      startedAt: toISO(world.startedAt),
      timeScale: world.timeScale,
      fuelPriceEurPerKg: world.fuelPriceCentsPerKg / 100,
      last24h: totals,
    };
  });

  app.get<{ Params: { id: string } }>('/worlds/:id/airlines', async (request, reply) => {
    const id = toWorldId(request.params.id);
    const world = await worldsRepo.findWorld(ctx.pool, id);
    if (world === null) return reply.code(404).send({ error: 'world_not_found' });

    const now = ctx.clock.now();
    const summaries = await airlineSummaries(ctx.pool, id, addDays(now, -30), addDays(now, 1));

    return summaries.map((summary) => ({
      id: summary.airlineId,
      name: summary.name,
      strategy: summary.strategy,
      hub: summary.hub,
      aircraft: summary.aircraft,
      routes: summary.routes,
      flightsLanded: summary.flightsLanded,
      pax: summary.pax,
      loadFactor: Math.round(summary.loadFactor * 1000) / 10,
      reputation: summary.reputation,
      onTimeRate: summary.onTimeRate,
      cashEur: toEuros(summary.cash),
    }));
  });

  app.get<{ Params: { id: string } }>('/airlines/:id', async (request, reply) => {
    const airline = await airlinesRepo.findAirline(ctx.pool, request.params.id as never);
    if (airline === null) return reply.code(404).send({ error: 'airline_not_found' });

    return {
      id: airline.id,
      name: airline.name,
      iataCode: airline.iataCode,
      icaoCode: airline.icaoCode,
      country: airline.country,
      hub: airline.hub,
      businessModel: airline.businessModel,
      controller: airline.controller,
      reputation: airline.reputation,
      onTimeRate: airline.onTimeRate,
      cashEur: toEuros(airline.cash),
      foundedAt: toISO(airline.foundedAt),
    };
  });
}
