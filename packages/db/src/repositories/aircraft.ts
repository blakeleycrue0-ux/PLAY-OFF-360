import type { Aircraft } from '@airline/domain';
import type { AircraftId, AirlineId, AirportCode, Instant, WorldId } from '@airline/shared';
import { toDbTimestamp } from '../mappers/common.js';
import { toAircraft } from '../mappers/entities.js';
import { exactlyOne, type Queryable } from '../pool.js';

const COLUMNS = `
  id, world_id, airline_id, type_code, registration, ownership, lease_rate_cents,
  purchase_price_cents, config, built_year, flight_hours, cycles, condition,
  next_check_type, next_check_at_hours, deferred_checks, status, current_airport, available_at`;

export async function insertAircraft(db: Queryable, aircraft: Aircraft): Promise<Aircraft> {
  const result = await db.query(
    `INSERT INTO aircraft (
       id, world_id, airline_id, type_code, registration, ownership, lease_rate_cents,
       purchase_price_cents, config, built_year, flight_hours, cycles, condition,
       next_check_type, next_check_at_hours, deferred_checks, status, current_airport, available_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
     RETURNING ${COLUMNS}`,
    [
      aircraft.id,
      aircraft.worldId,
      aircraft.airlineId,
      aircraft.typeCode,
      aircraft.registration,
      aircraft.ownership,
      aircraft.leaseRate,
      aircraft.purchasePrice,
      JSON.stringify(aircraft.config),
      aircraft.builtYear,
      aircraft.flightHours,
      aircraft.cycles,
      aircraft.condition,
      aircraft.nextCheckType,
      aircraft.nextCheckAtHours,
      aircraft.deferredChecks,
      aircraft.status,
      aircraft.currentAirport,
      toDbTimestamp(aircraft.availableAt),
    ],
  );
  return toAircraft(exactlyOne(result.rows, 'aircraft'));
}

export async function findAircraft(db: Queryable, id: AircraftId): Promise<Aircraft | null> {
  const result = await db.query(`SELECT ${COLUMNS} FROM aircraft WHERE id = $1`, [id]);
  const row = result.rows[0];
  return row === undefined ? null : toAircraft(row);
}

/** Bloquea el avión para el resto de la transacción: evita doble asignación. */
export async function findAircraftForUpdate(
  db: Queryable,
  id: AircraftId,
): Promise<Aircraft | null> {
  const result = await db.query(`SELECT ${COLUMNS} FROM aircraft WHERE id = $1 FOR UPDATE`, [id]);
  const row = result.rows[0];
  return row === undefined ? null : toAircraft(row);
}

export async function listFleet(db: Queryable, airlineId: AirlineId): Promise<readonly Aircraft[]> {
  const result = await db.query(
    `SELECT ${COLUMNS} FROM aircraft WHERE airline_id = $1 ORDER BY registration`,
    [airlineId],
  );
  return result.rows.map(toAircraft);
}

export async function listIdleAircraft(
  db: Queryable,
  worldId: WorldId,
  at: Instant,
): Promise<readonly Aircraft[]> {
  const result = await db.query(
    `SELECT ${COLUMNS} FROM aircraft
     WHERE world_id = $1 AND status IN ('idle', 'scheduled') AND available_at <= $2
     ORDER BY available_at`,
    [worldId, toDbTimestamp(at)],
  );
  return result.rows.map(toAircraft);
}

/** Marca el avión en vuelo y reserva su disponibilidad hasta llegada + turnaround. */
export async function markAircraftDeparted(
  db: Queryable,
  id: AircraftId,
  availableAt: Instant,
): Promise<void> {
  await db.query(`UPDATE aircraft SET status = 'in_flight', available_at = $2 WHERE id = $1`, [
    id,
    toDbTimestamp(availableAt),
  ]);
}

export interface AircraftArrivalUpdate {
  readonly currentAirport: AirportCode;
  readonly availableAt: Instant;
  readonly flightHours: number;
  readonly cycles: number;
  readonly condition: number;
  readonly nextCheckType: Aircraft['nextCheckType'];
  readonly nextCheckAtHours: number;
}

export async function applyAircraftArrival(
  db: Queryable,
  id: AircraftId,
  update: AircraftArrivalUpdate,
): Promise<void> {
  await db.query(
    `UPDATE aircraft SET
       status = 'idle', current_airport = $2, available_at = $3,
       flight_hours = $4, cycles = $5, condition = $6,
       next_check_type = $7, next_check_at_hours = $8
     WHERE id = $1`,
    [
      id,
      update.currentAirport,
      toDbTimestamp(update.availableAt),
      update.flightHours,
      update.cycles,
      update.condition,
      update.nextCheckType,
      update.nextCheckAtHours,
    ],
  );
}
