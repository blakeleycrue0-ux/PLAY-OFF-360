import type { Flight, PaxByCabin } from '@airline/domain';
import type { AirlineId, FlightId, Instant, Minutes, Money, WorldId } from '@airline/shared';
import { toDbTimestamp, toDbTimestampOrNull } from '../mappers/common.js';
import { toFlight } from '../mappers/entities.js';
import { exactlyOne, type Queryable } from '../pool.js';

const COLUMNS = `
  id, world_id, airline_id, route_id, aircraft_id, schedule_id, flight_number,
  origin, destination, scheduled_departure, scheduled_arrival, seats_offered, prices,
  actual_departure, actual_arrival, status, delay_minutes,
  pax, load_factor, revenue_cents, cost_cents, profit_cents, fuel_kg, resolved_at`;

export async function insertFlight(db: Queryable, flight: Flight): Promise<Flight> {
  const result = await db.query(
    `INSERT INTO flights (
       id, world_id, airline_id, route_id, aircraft_id, schedule_id, flight_number,
       origin, destination, scheduled_departure, scheduled_arrival, seats_offered, prices, status
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13::jsonb,$14)
     RETURNING ${COLUMNS}`,
    [
      flight.id,
      flight.worldId,
      flight.airlineId,
      flight.routeId,
      flight.aircraftId,
      flight.scheduleId,
      flight.flightNumber,
      flight.origin,
      flight.destination,
      toDbTimestamp(flight.scheduledDeparture),
      toDbTimestamp(flight.scheduledArrival),
      JSON.stringify(flight.seatsOffered),
      JSON.stringify(flight.prices),
      flight.status,
    ],
  );
  return toFlight(exactlyOne(result.rows, 'flights'));
}

export async function findFlight(db: Queryable, id: FlightId): Promise<Flight | null> {
  const result = await db.query(`SELECT ${COLUMNS} FROM flights WHERE id = $1`, [id]);
  const row = result.rows[0];
  return row === undefined ? null : toFlight(row);
}

/**
 * Bloquea el vuelo para el resto de la transacción.
 *
 * Es la primera línea de defensa contra el doble procesado: el manejador lee el
 * vuelo con `FOR UPDATE`, comprueba su estado y, si ya no es el esperado,
 * termina sin hacer nada (ADR-013).
 */
export async function findFlightForUpdate(db: Queryable, id: FlightId): Promise<Flight | null> {
  const result = await db.query(`SELECT ${COLUMNS} FROM flights WHERE id = $1 FOR UPDATE`, [id]);
  const row = result.rows[0];
  return row === undefined ? null : toFlight(row);
}

export interface DepartureUpdate {
  readonly actualDeparture: Instant;
  readonly scheduledArrival: Instant;
  readonly delayMinutes: Minutes;
  readonly pax: PaxByCabin;
  readonly loadFactor: number;
}

/** Escribe la realidad del despegue. Sólo surte efecto si el vuelo sigue programado. */
export async function markFlightDeparted(
  db: Queryable,
  id: FlightId,
  update: DepartureUpdate,
): Promise<boolean> {
  const result = await db.query(
    `UPDATE flights SET
       status = 'departed', actual_departure = $2, scheduled_arrival = $3,
       delay_minutes = $4, pax = $5::jsonb, load_factor = $6
     WHERE id = $1 AND status = 'scheduled'`,
    [
      id,
      toDbTimestamp(update.actualDeparture),
      toDbTimestamp(update.scheduledArrival),
      update.delayMinutes,
      JSON.stringify(update.pax),
      update.loadFactor,
    ],
  );
  return (result.rowCount ?? 0) > 0;
}

export interface SettlementUpdate {
  readonly actualArrival: Instant;
  readonly revenue: Money;
  readonly cost: Money;
  readonly profit: Money;
  readonly fuelKg: number;
  readonly resolvedAt: Instant;
}

/** Escribe el resultado del vuelo. Sólo surte efecto si estaba despegado. */
export async function settleFlight(
  db: Queryable,
  id: FlightId,
  update: SettlementUpdate,
): Promise<boolean> {
  const result = await db.query(
    `UPDATE flights SET
       status = 'landed', actual_arrival = $2, revenue_cents = $3, cost_cents = $4,
       profit_cents = $5, fuel_kg = $6, resolved_at = $7
     WHERE id = $1 AND status = 'departed'`,
    [
      id,
      toDbTimestamp(update.actualArrival),
      update.revenue,
      update.cost,
      update.profit,
      update.fuelKg,
      toDbTimestamp(update.resolvedAt),
    ],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function cancelFlight(db: Queryable, id: FlightId): Promise<boolean> {
  const result = await db.query(
    `UPDATE flights SET status = 'cancelled', pax = '{"economy":0,"business":0}'::jsonb,
       load_factor = 0, revenue_cents = 0, cost_cents = 0, profit_cents = 0, resolved_at = now()
     WHERE id = $1 AND status = 'scheduled'`,
    [id],
  );
  return (result.rowCount ?? 0) > 0;
}

/** Vuelos en el aire ahora mismo. Es la consulta que alimenta el mapa en vivo. */
export async function listAirborneFlights(
  db: Queryable,
  worldId: WorldId,
  limit = 1_000,
): Promise<readonly Flight[]> {
  const result = await db.query(
    `SELECT ${COLUMNS} FROM flights
     WHERE world_id = $1 AND status = 'departed'
     ORDER BY scheduled_departure DESC
     LIMIT $2`,
    [worldId, limit],
  );
  return result.rows.map(toFlight);
}

export async function listAirlineFlights(
  db: Queryable,
  airlineId: AirlineId,
  from: Instant,
  to: Instant,
): Promise<readonly Flight[]> {
  const result = await db.query(
    `SELECT ${COLUMNS} FROM flights
     WHERE airline_id = $1 AND scheduled_departure >= $2 AND scheduled_departure < $3
     ORDER BY scheduled_departure`,
    [airlineId, toDbTimestamp(from), toDbTimestamp(to)],
  );
  return result.rows.map(toFlight);
}

export async function findFlightBySchedule(
  db: Queryable,
  scheduleId: string,
  scheduledDeparture: Instant,
): Promise<Flight | null> {
  const result = await db.query(
    `SELECT ${COLUMNS} FROM flights WHERE schedule_id = $1 AND scheduled_departure = $2`,
    [scheduleId, toDbTimestamp(scheduledDeparture)],
  );
  const row = result.rows[0];
  return row === undefined ? null : toFlight(row);
}

export { toDbTimestampOrNull };
