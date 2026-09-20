import type { FastifyInstance } from 'fastify';
import { flightsRepo, airportsRepo } from '@airline/db';
import {
  calculateFlightPosition,
  flightPlanOf,
  greatCircleDistanceKm,
  totalPax,
  type Airport,
} from '@airline/domain';
import { toISO, worldId as toWorldId, type Instant } from '@airline/shared';
import type { ApiContext } from '../context.js';

/**
 * El mapa en vivo.
 *
 * Es el endpoint que demuestra la decisión central de la arquitectura: la
 * respuesta **no contiene posiciones**, contiene planes de vuelo. Cada cliente
 * calcula dónde está cada avión con `calculateFlightPosition`, la misma función
 * pura que usa el servidor, y todos ven lo mismo sin que nadie difunda nada
 * (docs/03 §3.2).
 *
 * Aquí se incluye la posición calculada en servidor sólo por comodidad de
 * inspección durante la Fase 1: el cliente real no la necesita.
 */
export function registerMapRoutes(app: FastifyInstance, ctx: ApiContext): void {
  app.get<{ Params: { id: string }; Querystring: { limit?: string } }>(
    '/worlds/:id/map/flights',
    async (request) => {
      const worldId = toWorldId(request.params.id);
      const limit = Math.min(2_000, Number(request.query.limit ?? 500));
      const now = ctx.clock.now();

      const flights = await flightsRepo.listAirborneFlights(ctx.pool, worldId, limit);
      const airports = await loadAirports(ctx, flights);

      return {
        serverTime: toISO(now),
        count: flights.length,
        flights: flights.map((flight) => {
          const plan = flightPlanOf(flight);
          const origin = airports.get(flight.origin);
          const destination = airports.get(flight.destination);

          return {
            id: plan.id,
            callsign: plan.flightNumber,
            airlineId: flight.airlineId,
            origin: plan.origin,
            destination: plan.destination,
            departure: toISO(plan.departure),
            arrival: toISO(plan.arrival),
            pax: flight.pax === null ? null : totalPax(flight.pax),
            position:
              origin === undefined || destination === undefined
                ? null
                : calculateFlightPosition(origin, destination, plan.departure, plan.arrival, now),
          };
        }),
      };
    },
  );

  app.get<{ Params: { id: string } }>('/flights/:id', async (request, reply) => {
    const flight = await flightsRepo.findFlight(ctx.pool, request.params.id as never);
    if (flight === null) return reply.code(404).send({ error: 'flight_not_found' });

    const airports = await loadAirports(ctx, [flight]);
    const origin = airports.get(flight.origin);
    const destination = airports.get(flight.destination);
    const plan = flightPlanOf(flight);
    const now: Instant = ctx.clock.now();

    return {
      id: flight.id,
      callsign: flight.flightNumber,
      status: flight.status,
      origin: flight.origin,
      destination: flight.destination,
      distanceKm:
        origin !== undefined && destination !== undefined
          ? Math.round(greatCircleDistanceKm(origin, destination))
          : null,
      scheduledDeparture: toISO(flight.scheduledDeparture),
      scheduledArrival: toISO(flight.scheduledArrival),
      actualDeparture: flight.actualDeparture === null ? null : toISO(flight.actualDeparture),
      actualArrival: flight.actualArrival === null ? null : toISO(flight.actualArrival),
      delayMinutes: flight.delayMinutes,
      seatsOffered: flight.seatsOffered,
      pax: flight.pax,
      loadFactor: flight.loadFactor,
      position:
        flight.status === 'departed' && origin !== undefined && destination !== undefined
          ? calculateFlightPosition(origin, destination, plan.departure, plan.arrival, now)
          : null,
    };
  });

  app.get<{ Params: { iata: string } }>('/airports/:iata', async (request, reply) => {
    const airport = await airportsRepo.findAirport(
      ctx.pool,
      request.params.iata.toUpperCase() as never,
    );
    if (airport === null) return reply.code(404).send({ error: 'airport_not_found' });
    return airport;
  });
}

async function loadAirports(
  ctx: ApiContext,
  flights: readonly { readonly origin: string; readonly destination: string }[],
): Promise<ReadonlyMap<string, Airport>> {
  const codes = new Set<string>();
  for (const flight of flights) {
    codes.add(flight.origin);
    codes.add(flight.destination);
  }
  return airportsRepo.findAirports(ctx.pool, [...codes] as never);
}
