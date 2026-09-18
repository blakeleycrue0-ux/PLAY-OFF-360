import type { Instant, FlightId, WorldId } from '@airline/shared';
import { fromDbTimestamp, toDbTimestamp } from '../mappers/common.js';
import type { Queryable } from '../pool.js';

export const FLIGHT_EVENT_KINDS = [
  'flight.created',
  'flight.departure.scheduled',
  'flight.departed',
  'flight.arrival.scheduled',
  'flight.landed',
  'flight.cancelled',
  'flight.delayed',
] as const;
export type FlightEventKind = (typeof FLIGHT_EVENT_KINDS)[number];

export interface FlightEvent {
  readonly worldId: WorldId;
  readonly flightId: FlightId;
  readonly flightScheduledDeparture: Instant;
  readonly kind: FlightEventKind;
  readonly occurredAt: Instant;
  readonly payload: Readonly<Record<string, unknown>>;
}

/**
 * Registro append-only de lo que le pasa a un vuelo.
 *
 * No es un log de texto: es la historia del mundo en filas. Las estadísticas y,
 * en fases posteriores, las noticias son proyecciones de esto, de modo que una
 * métrica nueva se calcula hacia atrás en vez de haberla tenido que prever
 * (docs/01 §1.6).
 */
export async function appendFlightEvent(db: Queryable, event: FlightEvent): Promise<void> {
  await db.query(
    `INSERT INTO flight_events (world_id, flight_id, flight_scheduled_departure, kind, occurred_at, payload)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
    [
      event.worldId,
      event.flightId,
      toDbTimestamp(event.flightScheduledDeparture),
      event.kind,
      toDbTimestamp(event.occurredAt),
      JSON.stringify(event.payload),
    ],
  );
}

export async function listFlightEvents(
  db: Queryable,
  flightId: FlightId,
): Promise<readonly FlightEvent[]> {
  const result = await db.query(
    `SELECT world_id, flight_id, flight_scheduled_departure, kind, occurred_at, payload
     FROM flight_events WHERE flight_id = $1 ORDER BY occurred_at, id`,
    [flightId],
  );

  return result.rows.map((row) => ({
    worldId: row['world_id'] as WorldId,
    flightId: row['flight_id'] as FlightId,
    flightScheduledDeparture: fromDbTimestamp(row['flight_scheduled_departure'] as Date),
    kind: row['kind'] as FlightEventKind,
    occurredAt: fromDbTimestamp(row['occurred_at'] as Date),
    payload: row['payload'] as Record<string, unknown>,
  }));
}

export async function countFlightEvents(
  db: Queryable,
  worldId: WorldId,
  kind: FlightEventKind,
): Promise<number> {
  const result = await db.query(
    `SELECT count(*)::int AS total FROM flight_events WHERE world_id = $1 AND kind = $2`,
    [worldId, kind],
  );
  return Number(result.rows[0]?.['total'] ?? 0);
}
