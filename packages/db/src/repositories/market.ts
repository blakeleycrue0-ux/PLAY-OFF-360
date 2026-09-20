import { airlineId as toAirlineId, flightId as toFlightId, minutes, money } from '@airline/shared';
import type {
  AirlineId,
  AirportCode,
  FlightId,
  Instant,
  Minutes,
  Money,
  WorldId,
} from '@airline/shared';
import { toDbTimestamp } from '../mappers/common.js';
import type { Queryable } from '../pool.js';

/**
 * Una oferta competidora en un par origen-destino, con todo lo que el modelo de
 * elección necesita para valorarla.
 *
 * Es un **modelo de lectura**, no una entidad: existe para alimentar
 * `allocateDemand` en una sola consulta en vez de cargar cuatro repositorios y
 * recomponer. Por eso vive aparte de los repositorios de entidades.
 */
export interface MarketOffer {
  readonly flightId: FlightId;
  readonly airlineId: AirlineId;
  readonly prices: { readonly economy: Money; readonly business: Money };
  readonly seats: { readonly economy: number; readonly business: number };
  readonly departureMinuteUtc: Minutes;
  readonly originUtcOffsetMinutes: number;
  readonly serviceLevel: number;
  readonly reputation: number;
  readonly onTimeRate: number;
  readonly maxSeats: number;
  /** Máscara de días de la plantilla; 0 si el vuelo no viene de una. */
  readonly scheduleDaysOfWeek: number;
  /** El origen es el hub de la aerolínea: ventaja del operador establecido. */
  readonly operatesFromHub: boolean;
}

/**
 * Ofertas competidoras de un par origen-destino dentro de una ventana.
 *
 * Incluye los vuelos ya despegados del mismo día: un pasajero que compra para
 * hoy elige entre todo lo que sale hoy, no sólo entre lo que aún no ha salido.
 */
export async function findMarketOffers(
  db: Queryable,
  worldId: WorldId,
  origin: AirportCode,
  destination: AirportCode,
  from: Instant,
  to: Instant,
): Promise<readonly MarketOffer[]> {
  const result = await db.query(
    `SELECT
       f.id,
       f.airline_id,
       f.prices,
       f.seats_offered,
       f.scheduled_departure,
       r.service_level,
       al.reputation,
       al.on_time_rate,
       (al.hub = f.origin) AS operates_from_hub,
       t.max_seats,
       ap.utc_offset_minutes,
       COALESCE(fs.days_of_week, 0) AS schedule_days_of_week
     FROM flights f
     JOIN routes r          ON r.id = f.route_id
     JOIN airlines al       ON al.id = f.airline_id
     JOIN aircraft ac       ON ac.id = f.aircraft_id
     JOIN aircraft_types t  ON t.code = ac.type_code
     JOIN airports ap       ON ap.iata = f.origin
     LEFT JOIN flight_schedules fs ON fs.id = f.schedule_id
     WHERE f.world_id = $1
       AND f.origin = $2
       AND f.destination = $3
       AND f.scheduled_departure >= $4
       AND f.scheduled_departure < $5
       AND f.status IN ('scheduled', 'departed')
     ORDER BY f.scheduled_departure`,
    [worldId, origin, destination, toDbTimestamp(from), toDbTimestamp(to)],
  );

  return result.rows.map((row) => {
    const departure = row['scheduled_departure'] as Date;
    return {
      flightId: toFlightId(row['id'] as string),
      airlineId: toAirlineId(row['airline_id'] as string),
      prices: {
        economy: money((row['prices'] as { economy: number }).economy),
        business: money((row['prices'] as { business: number }).business),
      },
      seats: {
        economy: (row['seats_offered'] as { economy: number }).economy,
        business: (row['seats_offered'] as { business: number }).business,
      },
      departureMinuteUtc: minutes(departure.getUTCHours() * 60 + departure.getUTCMinutes()),
      originUtcOffsetMinutes: Number(row['utc_offset_minutes']),
      serviceLevel: Number(row['service_level']),
      reputation: Number(row['reputation']),
      onTimeRate: Number(row['on_time_rate']),
      maxSeats: Number(row['max_seats']),
      scheduleDaysOfWeek: Number(row['schedule_days_of_week']),
      operatesFromHub: Boolean(row['operates_from_hub']),
    };
  });
}
