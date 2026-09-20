import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  createPool,
  databaseConfigFromEnv,
  airlineSummaries,
  worldTotals,
  worldsRepo,
} from '@airline/db';
import { calculateFlightPosition, greatCircleDistanceKm } from '@airline/domain';
import { addDays, instant, toEuros, toISO, type Instant } from '@airline/shared';
import { projectPoint, type Projection } from './lib/projection.js';

/**
 * Exporta una instantánea del mundo para la interfaz.
 *
 * Sirve para dos cosas: alimentar una vista previa estática que se pueda
 * enseñar sin levantar nada, y tener un juego de datos fijo con el que trabajar
 * el diseño sin depender de que la base esté corriendo.
 */

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT_FILE = path.join(ROOT, 'data', 'ui-snapshot.json');

interface MapFile {
  readonly view: { width: number; height: number };
  readonly projection: Projection;
  readonly land: string;
  readonly borders: string;
}

async function main(): Promise<void> {
  const pool = createPool(databaseConfigFromEnv(process.env, 'airline-ui-snapshot'));

  try {
    const map = JSON.parse(
      await readFile(path.join(ROOT, 'data', 'map-europe.json'), 'utf8'),
    ) as MapFile;
    // Exactamente la misma proyección con la que se dibujó el mapa.
    const project = (lon: number, lat: number): { x: number; y: number } =>
      projectPoint(map.projection, lon, lat);

    const [world] = await worldsRepo.listOpenWorlds(pool);
    if (world === undefined)
      throw new Error('No hay ningún mundo abierto. Ejecuta antes la simulación.');

    const now: Instant = instant(Date.now());
    const dayStart = addDays(now, -1);

    const totals = await worldTotals(pool, world.id, dayStart, addDays(now, 1));
    const airlines = await airlineSummaries(pool, world.id, dayStart, addDays(now, 1));

    const airportRows = await pool.query(`
      SELECT a.iata, a.name, a.city, a.country, a.size_class, a.market_weight,
             ST_Y(a.location::geometry) AS lat, ST_X(a.location::geometry) AS lon,
             (SELECT count(*) FROM routes r WHERE r.origin = a.iata AND r.status = 'active')::int AS departures
      FROM airports a
      ORDER BY a.market_weight DESC`);

    const routeRows = await pool.query(
      `
      SELECT r.origin, r.destination, al.name AS airline,
             ST_Y(o.location::geometry) AS o_lat, ST_X(o.location::geometry) AS o_lon,
             ST_Y(d.location::geometry) AS d_lat, ST_X(d.location::geometry) AS d_lon
      FROM routes r
      JOIN airlines al ON al.id = r.airline_id
      JOIN airports o ON o.iata = r.origin
      JOIN airports d ON d.iata = r.destination
      WHERE r.world_id = $1 AND r.status = 'active'`,
      [world.id],
    );

    const flightRows = await pool.query(
      `
      SELECT f.id, f.flight_number, f.origin, f.destination, f.actual_departure, f.scheduled_arrival,
             f.pax, f.seats_offered, al.name AS airline, al.icao_code, al.npc_strategy, t.name AS aircraft,
             ST_Y(o.location::geometry) AS o_lat, ST_X(o.location::geometry) AS o_lon,
             ST_Y(d.location::geometry) AS d_lat, ST_X(d.location::geometry) AS d_lon
      FROM flights f
      JOIN airlines al ON al.id = f.airline_id
      JOIN aircraft ac ON ac.id = f.aircraft_id
      JOIN aircraft_types t ON t.code = ac.type_code
      JOIN airports o ON o.iata = f.origin
      JOIN airports d ON d.iata = f.destination
      WHERE f.world_id = $1 AND f.status = 'departed'`,
      [world.id],
    );

    const snapshot = {
      generatedAt: toISO(now),
      // Los parámetros de la proyección viajan con los datos para que el
      // cliente proyecte por su cuenta cualquier punto —un avión en
      // movimiento— sin volver a preguntar al servidor.
      projection: map.projection,
      world: {
        id: world.id,
        name: world.name,
        startedAt: toISO(world.startedAt),
        fuelPriceEurPerKg: world.fuelPriceCentsPerKg / 100,
      },
      totals,
      map: { view: map.view, land: map.land, borders: map.borders },
      airports: airportRows.rows.map((r) => {
        const point = project(Number(r['lon']), Number(r['lat']));
        return {
          iata: r['iata'] as string,
          name: r['name'] as string,
          city: r['city'] as string,
          country: r['country'] as string,
          size: Number(r['size_class']),
          weight: Number(r['market_weight']),
          departures: Number(r['departures']),
          x: Math.round(point.x * 10) / 10,
          y: Math.round(point.y * 10) / 10,
        };
      }),
      routes: routeRows.rows.map((r) => {
        const from = project(Number(r['o_lon']), Number(r['o_lat']));
        const to = project(Number(r['d_lon']), Number(r['d_lat']));
        return {
          airline: r['airline'] as string,
          x1: Math.round(from.x * 10) / 10,
          y1: Math.round(from.y * 10) / 10,
          x2: Math.round(to.x * 10) / 10,
          y2: Math.round(to.y * 10) / 10,
        };
      }),
      flights: flightRows.rows.map((r) => {
        const origin = { latitude: Number(r['o_lat']), longitude: Number(r['o_lon']) };
        const destination = { latitude: Number(r['d_lat']), longitude: Number(r['d_lon']) };
        const departure = instant(new Date(r['actual_departure'] as Date).getTime());
        const arrival = instant(new Date(r['scheduled_arrival'] as Date).getTime());
        const position = calculateFlightPosition(origin, destination, departure, arrival, now);
        const point = project(position.longitude, position.latitude);
        const pax = r['pax'] as { economy: number; business: number } | null;
        const seats = r['seats_offered'] as { economy: number; business: number };

        return {
          id: r['id'] as string,
          callsign: r['flight_number'] as string,
          airline: r['airline'] as string,
          strategy: r['npc_strategy'] as string,
          aircraft: r['aircraft'] as string,
          origin: r['origin'] as string,
          destination: r['destination'] as string,
          departure: toISO(departure),
          arrival: toISO(arrival),
          distanceKm: Math.round(greatCircleDistanceKm(origin, destination)),
          originLat: Math.round(origin.latitude * 1e4) / 1e4,
          originLon: Math.round(origin.longitude * 1e4) / 1e4,
          destLat: Math.round(destination.latitude * 1e4) / 1e4,
          destLon: Math.round(destination.longitude * 1e4) / 1e4,
          pax: pax === null ? 0 : pax.economy + pax.business,
          seats: seats.economy + seats.business,
          heading: Math.round(position.heading),
          altitudeM: Math.round(position.altitudeMeters),
          progress: Math.round(position.progress * 1000) / 1000,
          from: projectAirport(project, origin),
          to: projectAirport(project, destination),
          x: Math.round(point.x * 10) / 10,
          y: Math.round(point.y * 10) / 10,
        };
      }),
      airlines: airlines
        .slice()
        .sort((a, b) => b.ledgerBalance - a.ledgerBalance)
        .map((a) => ({
          name: a.name,
          strategy: a.strategy,
          hub: a.hub,
          aircraft: a.aircraft,
          routes: a.routes,
          flights: a.flightsLanded,
          pax: a.pax,
          loadFactor: Math.round(a.loadFactor * 1000) / 10,
          onTime: a.onTimeRate,
          reputation: a.reputation,
          cashEur: toEuros(a.ledgerBalance),
          resultEur: toEuros(a.profit),
        })),
    };

    await writeFile(OUT_FILE, `${JSON.stringify(snapshot)}\n`);
    console.log(
      `Instantánea: ${snapshot.airports.length} aeropuertos, ${snapshot.routes.length} rutas, ` +
        `${snapshot.flights.length} vuelos en el aire, ${snapshot.airlines.length} aerolíneas.`,
    );
    console.log(`Escrita en ${path.relative(ROOT, OUT_FILE)}`);
  } finally {
    await pool.end();
  }
}

function projectAirport(
  project: (lon: number, lat: number) => { x: number; y: number },
  point: { latitude: number; longitude: number },
): { x: number; y: number } {
  const projected = project(point.longitude, point.latitude);
  return { x: Math.round(projected.x * 10) / 10, y: Math.round(projected.y * 10) / 10 };
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? (error.stack ?? error.message) : error);
  process.exitCode = 1;
});
