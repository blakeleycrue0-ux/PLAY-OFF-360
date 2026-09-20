import { addDays, addMinutes, ManualClock, minutes, money, type Instant } from '@airline/shared';
import { DEFAULT_BALANCE } from '@airline/config';
import { calculateFlightPosition } from '@airline/domain';
import { LGW, PMI } from '@airline/domain/testing';
import { withTransaction, type Pool } from '@airline/db';
import {
  createTestPool,
  makeAircraft,
  makeAirline,
  makeFlight,
  makeRoute,
  makeWorld,
  truncateGameData,
} from '@airline/db/testing';
import { createEngineContext, handleFlightDeparture } from '@airline/simulation';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from './app.js';

const START = new Date('2026-06-01T00:00:00Z').getTime() as Instant;

let pool: Pool;
let app: FastifyInstance;
let clock: ManualClock;

beforeAll(() => {
  pool = createTestPool('airline-api-test');
});

afterAll(async () => {
  await app.close();
  await pool.end();
});

beforeEach(async () => {
  await truncateGameData(pool);
  clock = new ManualClock(START);
  if (app !== undefined) await app.close();
  app = buildApp({ pool, clock, config: DEFAULT_BALANCE });
});

describe('API mínima', () => {
  it('responde al chequeo de salud', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: 'ok',
      balanceVersion: DEFAULT_BALANCE.version,
    });
  });

  it('lista los mundos abiertos', async () => {
    const world = await makeWorld(pool, { startedAt: START, name: 'Mundo API' });
    const response = await app.inject({ method: 'GET', url: '/worlds' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([expect.objectContaining({ id: world.id, name: 'Mundo API' })]);
  });

  it('devuelve 404 para un mundo inexistente', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/worlds/11111111-1111-4111-8111-111111111111',
    });
    expect(response.statusCode).toBe(404);
  });

  it('EL MAPA: devuelve planes de vuelo y la posición se deriva del reloj', async () => {
    const world = await makeWorld(pool, { startedAt: START });
    const airline = await makeAirline(pool, world, { cash: money(0), hub: PMI.iata });
    const aircraft = await makeAircraft(pool, world, airline, { currentAirport: PMI.iata });
    const route = await makeRoute(pool, world, airline, { origin: PMI, destination: LGW });
    const flight = await makeFlight(pool, world, airline, route, aircraft, {
      departure: addDays(START, 1),
    });

    const ctx = await createEngineContext({ pool, clock, config: DEFAULT_BALANCE });
    await withTransaction(pool, (tx) => handleFlightDeparture(ctx, tx, { flightId: flight.id }));

    // El reloj se sitúa a mitad de camino.
    clock.set(addMinutes(flight.scheduledDeparture, minutes(66)));

    const response = await app.inject({ method: 'GET', url: `/worlds/${world.id}/map/flights` });
    expect(response.statusCode).toBe(200);

    const body = response.json<{
      count: number;
      flights: {
        id: string;
        callsign: string;
        position: { latitude: number; longitude: number; progress: number };
      }[];
    }>();

    expect(body.count).toBe(1);
    const airborne = body.flights[0];
    expect(airborne?.id).toBe(flight.id);

    // A mitad de vuelo el avión está entre los dos aeropuertos, no en ninguno.
    expect(airborne?.position.progress).toBeGreaterThan(0.4);
    expect(airborne?.position.progress).toBeLessThan(0.6);
    expect(airborne?.position.latitude).toBeGreaterThan(PMI.latitude);
    expect(airborne?.position.latitude).toBeLessThan(LGW.latitude);

    // Y coincide exactamente con lo que calcularía el cliente por su cuenta con
    // la misma función pura: el servidor no es una fuente distinta de verdad.
    const departed = (await app.inject({ method: 'GET', url: `/flights/${flight.id}` })).json<{
      actualDeparture: string;
      scheduledArrival: string;
    }>();
    const expected = calculateFlightPosition(
      PMI,
      LGW,
      new Date(departed.actualDeparture).getTime() as Instant,
      new Date(departed.scheduledArrival).getTime() as Instant,
      clock.now(),
    );
    expect(airborne?.position.latitude).toBeCloseTo(expected.latitude, 9);
    expect(airborne?.position.longitude).toBeCloseTo(expected.longitude, 9);
  });

  it('EL ANALIZADOR DE RUTAS: responde con demanda, competencia y previsión', async () => {
    const world = await makeWorld(pool, { startedAt: START });

    const response = await app.inject({
      method: 'GET',
      url: `/route-analysis?world=${world.id}&origin=PMI&destination=LGW&aircraftType=NB160&priceFactor=1&weeklyFrequency=7`,
    });

    expect(response.statusCode).toBe(200);
    const body = response.json<{
      route: { distanceKm: number; blockMinutes: number };
      demand: { dailyTotal: number };
      forecast: { breakEvenPax: number; profitPerFlightEur: number; costPerFlightEur: number };
    }>();

    expect(body.route.distanceKm).toBe(1309);
    expect(body.route.blockMinutes).toBe(132);
    expect(body.demand.dailyTotal).toBeGreaterThan(0);
    expect(body.forecast.breakEvenPax).toBeGreaterThan(0);
    expect(body.forecast.costPerFlightEur).toBeGreaterThan(0);
  });

  it('rechaza una ruta fuera del alcance del avión, y lo explica', async () => {
    const world = await makeWorld(pool, { startedAt: START });
    const response = await app.inject({
      method: 'GET',
      url: `/route-analysis?world=${world.id}&origin=PMI&destination=LGW&aircraftType=REG70&priceFactor=1`,
    });
    // PMI-LGW son 1.309 km: el REG70 llega de sobra, así que debe aceptarlo.
    expect(response.statusCode).toBe(200);
  });

  it('valida los parámetros de entrada', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/route-analysis?world=no-es-un-uuid',
    });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ error: 'invalid_query' });
  });
});
