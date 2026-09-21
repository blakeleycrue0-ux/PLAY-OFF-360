import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  createPool,
  databaseConfigFromEnv,
  airlineSummaries,
  worldTotals,
  worldsRepo,
} from '@airline/db';
import { greatCircleDistanceKm } from '@airline/domain';
import { addDays, instant, startOfUtcDay, toEuros, toISO, type Instant } from '@airline/shared';
import { toDbTimestamp } from '@airline/db';

/**
 * Exporta una instantánea del mundo para la interfaz.
 *
 * Sirve para dos cosas: alimentar una vista previa estática que se pueda
 * enseñar sin levantar nada, y tener un juego de datos fijo con el que trabajar
 * el diseño sin depender de que la base esté corriendo.
 */

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT_FILE = path.join(ROOT, 'data', 'ui-snapshot.json');

/** La geometría que escribe scripts/build-map-geometry.ts, en grados. */
interface MapFile {
  readonly land: { readonly type: 'MultiPolygon'; readonly coordinates: number[][][][] };
  readonly borders: { readonly type: 'MultiLineString'; readonly coordinates: number[][][] };
}

/** Coordenada a cuatro decimales: unos 11 m, de sobra para situar un aeropuerto. */
function deg(value: unknown): number {
  return Math.round(Number(value) * 1e4) / 1e4;
}

async function main(): Promise<void> {
  const pool = createPool(databaseConfigFromEnv(process.env, 'airline-ui-snapshot'));

  try {
    const map = JSON.parse(
      await readFile(path.join(ROOT, 'data', 'world-map.json'), 'utf8'),
    ) as MapFile;

    const [world] = await worldsRepo.listOpenWorlds(pool);
    if (world === undefined)
      throw new Error('No hay ningún mundo abierto. Ejecuta antes la simulación.');

    const now: Instant = instant(Date.now());
    // Los totales y la clasificación miran las últimas 24 horas de mundo.
    const since = addDays(now, -1);

    const totals = await worldTotals(pool, world.id, since, addDays(now, 1));
    const airlines = await airlineSummaries(pool, world.id, since, addDays(now, 1));

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

    // Se exporta el día entero, no sólo lo que está en el aire en este
    // instante. La vista previa es estática y tiene que seguir viva mañana:
    // con un día completo puede reproducirlo contra el reloj real, y como las
    // plantillas de las compañías se repiten a diario, lo que se ve a las 19:20
    // de cualquier día es lo que de verdad opera a esa hora.
    const dayStart = startOfUtcDay(now);
    const dayEnd = addDays(dayStart, 1);

    const flightRows = await pool.query(
      `
      SELECT f.id, f.flight_number, f.origin, f.destination,
             COALESCE(f.actual_departure, f.scheduled_departure) AS departure,
             f.scheduled_arrival, f.status, f.pax, f.seats_offered,
             al.name AS airline, t.name AS aircraft,
             ST_Y(o.location::geometry) AS o_lat, ST_X(o.location::geometry) AS o_lon,
             ST_Y(d.location::geometry) AS d_lat, ST_X(d.location::geometry) AS d_lon
      FROM flights f
      JOIN airlines al ON al.id = f.airline_id
      JOIN aircraft ac ON ac.id = f.aircraft_id
      JOIN aircraft_types t ON t.code = ac.type_code
      JOIN airports o ON o.iata = f.origin
      JOIN airports d ON d.iata = f.destination
      WHERE f.world_id = $1
        AND f.status <> 'cancelled'
        AND f.scheduled_departure >= $2
        AND f.scheduled_departure < $3
      ORDER BY f.scheduled_departure`,
      [world.id, toDbTimestamp(dayStart), toDbTimestamp(dayEnd)],
    );

    const snapshot = {
      generatedAt: toISO(now),
      world: {
        id: world.id,
        name: world.name,
        startedAt: toISO(world.startedAt),
        fuelPriceEurPerKg: world.fuelPriceCentsPerKg / 100,
      },
      totals,
      // La geometría viaja en grados y proyecta el cliente: el globo cambia de
      // proyección en cada fotograma mientras se gira, así que aquí no se puede
      // decidir dónde cae un punto en pantalla.
      map: { land: map.land, borders: map.borders },
      airports: airportRows.rows.map((r) => ({
        iata: r['iata'] as string,
        name: r['name'] as string,
        city: r['city'] as string,
        country: r['country'] as string,
        size: Number(r['size_class']),
        weight: Number(r['market_weight']),
        departures: Number(r['departures']),
        lat: deg(r['lat']),
        lon: deg(r['lon']),
      })),
      routes: routeRows.rows.map((r) => ({
        airline: r['airline'] as string,
        oLat: deg(r['o_lat']),
        oLon: deg(r['o_lon']),
        dLat: deg(r['d_lat']),
        dLon: deg(r['d_lon']),
      })),
      // Minuto del día en que sale y en que llega, en vez de instantes
      // absolutos: es lo que permite al cliente situar el día sobre la fecha
      // de hoy sin arrastrar la fecha en la que se simuló.
      dayStart: toISO(dayStart),
      flights: flightRows.rows.map((r) => {
        const origin = { latitude: Number(r['o_lat']), longitude: Number(r['o_lon']) };
        const destination = { latitude: Number(r['d_lat']), longitude: Number(r['d_lon']) };
        const departure = instant(new Date(r['departure'] as Date).getTime());
        const arrival = instant(new Date(r['scheduled_arrival'] as Date).getTime());
        const pax = r['pax'] as { economy: number; business: number } | null;
        const seats = r['seats_offered'] as { economy: number; business: number };
        const seatsTotal = seats.economy + seats.business;

        // Un vuelo que la simulación no llegó a resolver no tiene pasaje
        // escrito. Se estima con la ocupación media del mundo para que la
        // reproducción no muestre aviones vacíos que en realidad iban llenos.
        const paxTotal =
          pax === null ? Math.round(seatsTotal * totals.loadFactor) : pax.economy + pax.business;

        return {
          id: r['id'] as string,
          callsign: r['flight_number'] as string,
          airline: r['airline'] as string,
          aircraft: r['aircraft'] as string,
          origin: r['origin'] as string,
          destination: r['destination'] as string,
          depMs: departure - dayStart,
          arrMs: arrival - dayStart,
          distanceKm: Math.round(greatCircleDistanceKm(origin, destination)),
          oLat: deg(origin.latitude),
          oLon: deg(origin.longitude),
          dLat: deg(destination.latitude),
          dLon: deg(destination.longitude),
          pax: paxTotal,
          seats: seatsTotal,
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
        `${snapshot.flights.length} vuelos del día, ${snapshot.airlines.length} aerolíneas.`,
    );
    console.log(`Escrita en ${path.relative(ROOT, OUT_FILE)}`);
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? (error.stack ?? error.message) : error);
  process.exitCode = 1;
});
