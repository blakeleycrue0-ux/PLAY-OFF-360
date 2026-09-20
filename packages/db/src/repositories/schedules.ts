import type { FlightSchedule } from '@airline/domain';
import type { Instant, ScheduleId, WorldId } from '@airline/shared';
import { toDbTimestamp, toDbTimestampOrNull } from '../mappers/common.js';
import { toFlightSchedule } from '../mappers/entities.js';
import { exactlyOne, type Queryable } from '../pool.js';

const COLUMNS = `
  id, route_id, aircraft_id, days_of_week, departure_minute_utc, flight_number,
  valid_from, valid_to, is_active`;

export interface ScheduleRecord {
  readonly schedule: FlightSchedule;
  readonly worldId: WorldId;
  readonly materializedUntil: Instant;
}

export async function insertSchedule(
  db: Queryable,
  worldId: WorldId,
  schedule: FlightSchedule,
  materializedUntil: Instant,
): Promise<FlightSchedule> {
  const result = await db.query(
    `INSERT INTO flight_schedules (
       id, world_id, route_id, aircraft_id, days_of_week, departure_minute_utc,
       flight_number, valid_from, valid_to, is_active, materialized_until
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING ${COLUMNS}`,
    [
      schedule.id,
      worldId,
      schedule.routeId,
      schedule.aircraftId,
      schedule.daysOfWeek,
      schedule.departureMinuteUtc,
      schedule.flightNumber,
      toDbTimestamp(schedule.validFrom),
      toDbTimestampOrNull(schedule.validTo),
      schedule.isActive,
      toDbTimestamp(materializedUntil),
    ],
  );
  return toFlightSchedule(exactlyOne(result.rows, 'flight_schedules'));
}

export async function findSchedule(db: Queryable, id: ScheduleId): Promise<FlightSchedule | null> {
  const result = await db.query(`SELECT ${COLUMNS} FROM flight_schedules WHERE id = $1`, [id]);
  const row = result.rows[0];
  return row === undefined ? null : toFlightSchedule(row);
}

/**
 * Plantillas cuya materialización se ha quedado corta.
 *
 * Los vuelos no se crean de una vez para siempre: se materializan unos días por
 * delante del reloj. Así una plantilla activa durante meses no inunda la base
 * con vuelos que quizá nunca se operen.
 */
export async function listSchedulesToMaterialize(
  db: Queryable,
  worldId: WorldId,
  horizon: Instant,
  limit = 500,
): Promise<readonly ScheduleRecord[]> {
  const result = await db.query(
    `SELECT ${COLUMNS}, world_id, materialized_until FROM flight_schedules
     WHERE world_id = $1 AND is_active AND materialized_until < $2
       AND (valid_to IS NULL OR valid_to > materialized_until)
     ORDER BY materialized_until
     LIMIT $3`,
    [worldId, toDbTimestamp(horizon), limit],
  );

  return result.rows.map((row) => ({
    schedule: toFlightSchedule(row),
    worldId,
    materializedUntil: new Date(row['materialized_until'] as Date).getTime() as Instant,
  }));
}

export async function updateMaterializedUntil(
  db: Queryable,
  id: ScheduleId,
  until: Instant,
): Promise<void> {
  await db.query(`UPDATE flight_schedules SET materialized_until = $2 WHERE id = $1`, [
    id,
    toDbTimestamp(until),
  ]);
}
