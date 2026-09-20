import { money, type AirlineId, type Instant, type Money, type WorldId } from '@airline/shared';
import { toDbTimestamp } from '../mappers/common.js';
import type { Queryable } from '../pool.js';

/**
 * Consultas de resultados para el arnés de simulación y para las pantallas de
 * finanzas. Son agregados de lectura, no entidades: por eso viven aparte de los
 * repositorios.
 */

export interface AirlineSummary {
  readonly airlineId: AirlineId;
  readonly name: string;
  readonly strategy: string | null;
  readonly hub: string;
  readonly cash: Money;
  readonly reputation: number;
  readonly onTimeRate: number;
  readonly routes: number;
  readonly aircraft: number;
  readonly flightsScheduled: number;
  readonly flightsLanded: number;
  readonly flightsCancelled: number;
  readonly pax: number;
  readonly seats: number;
  readonly loadFactor: number;
  readonly revenue: Money;
  readonly cost: Money;
  readonly profit: Money;
  /** Suma del ledger: incluye costes fijos que no cuelgan de ningún vuelo. */
  readonly ledgerBalance: Money;
}

export async function airlineSummaries(
  db: Queryable,
  worldId: WorldId,
  from: Instant,
  to: Instant,
): Promise<readonly AirlineSummary[]> {
  const result = await db.query(
    `SELECT
       a.id, a.name, a.npc_strategy, a.hub, a.cash_cents, a.reputation, a.on_time_rate,
       (SELECT count(*) FROM routes r WHERE r.airline_id = a.id AND r.status = 'active')::int AS routes,
       (SELECT count(*) FROM aircraft ac WHERE ac.airline_id = a.id)::int AS aircraft,
       COALESCE(f.scheduled, 0)::int  AS flights_scheduled,
       COALESCE(f.landed, 0)::int     AS flights_landed,
       COALESCE(f.cancelled, 0)::int  AS flights_cancelled,
       COALESCE(f.pax, 0)::bigint     AS pax,
       COALESCE(f.seats, 0)::bigint   AS seats,
       COALESCE(f.revenue, 0)::bigint AS revenue,
       COALESCE(f.cost, 0)::bigint    AS cost,
       COALESCE(l.balance, 0)::bigint AS ledger_balance
     FROM airlines a
     LEFT JOIN LATERAL (
       SELECT
         count(*) FILTER (WHERE status <> 'cancelled')                       AS scheduled,
         count(*) FILTER (WHERE status = 'landed')                           AS landed,
         count(*) FILTER (WHERE status = 'cancelled')                        AS cancelled,
         SUM(COALESCE((pax ->> 'economy')::int, 0) + COALESCE((pax ->> 'business')::int, 0))
           FILTER (WHERE status = 'landed')                                  AS pax,
         SUM((seats_offered ->> 'economy')::int + (seats_offered ->> 'business')::int)
           FILTER (WHERE status = 'landed')                                  AS seats,
         SUM(revenue_cents) FILTER (WHERE status = 'landed')                 AS revenue,
         SUM(cost_cents) FILTER (WHERE status = 'landed')                    AS cost
       FROM flights
       WHERE flights.airline_id = a.id
         AND flights.scheduled_departure >= $2
         AND flights.scheduled_departure < $3
     ) f ON true
     LEFT JOIN LATERAL (
       SELECT SUM(amount_cents) AS balance FROM ledger_entries le WHERE le.airline_id = a.id
     ) l ON true
     WHERE a.world_id = $1 AND a.is_active
     ORDER BY a.name`,
    [worldId, toDbTimestamp(from), toDbTimestamp(to)],
  );

  return result.rows.map((row) => {
    const revenue = money(Number(row['revenue']));
    const cost = money(Number(row['cost']));
    const pax = Number(row['pax']);
    const seats = Number(row['seats']);

    return {
      airlineId: row['id'] as AirlineId,
      name: row['name'] as string,
      strategy: row['npc_strategy'] as string | null,
      hub: row['hub'] as string,
      cash: money(Number(row['cash_cents'])),
      reputation: Number(row['reputation']),
      onTimeRate: Number(row['on_time_rate']),
      routes: Number(row['routes']),
      aircraft: Number(row['aircraft']),
      flightsScheduled: Number(row['flights_scheduled']),
      flightsLanded: Number(row['flights_landed']),
      flightsCancelled: Number(row['flights_cancelled']),
      pax,
      seats,
      loadFactor: seats > 0 ? pax / seats : 0,
      revenue,
      cost,
      profit: money(revenue - cost),
      ledgerBalance: money(Number(row['ledger_balance'])),
    };
  });
}

export interface WorldTotals {
  readonly flights: number;
  readonly landed: number;
  readonly cancelled: number;
  readonly pax: number;
  readonly loadFactor: number;
  readonly onTimePercent: number;
}

export async function worldTotals(
  db: Queryable,
  worldId: WorldId,
  from: Instant,
  to: Instant,
): Promise<WorldTotals> {
  const result = await db.query(
    `SELECT
       count(*)::int AS flights,
       count(*) FILTER (WHERE status = 'landed')::int AS landed,
       count(*) FILTER (WHERE status = 'cancelled')::int AS cancelled,
       COALESCE(SUM(COALESCE((pax ->> 'economy')::int, 0) + COALESCE((pax ->> 'business')::int, 0))
         FILTER (WHERE status = 'landed'), 0)::bigint AS pax,
       COALESCE(SUM((seats_offered ->> 'economy')::int + (seats_offered ->> 'business')::int)
         FILTER (WHERE status = 'landed'), 0)::bigint AS seats,
       count(*) FILTER (WHERE status = 'landed' AND delay_minutes <= 15)::int AS on_time
     FROM flights
     WHERE world_id = $1 AND scheduled_departure >= $2 AND scheduled_departure < $3`,
    [worldId, toDbTimestamp(from), toDbTimestamp(to)],
  );

  const row = result.rows[0];
  const landed = Number(row?.['landed'] ?? 0);
  const pax = Number(row?.['pax'] ?? 0);
  const seats = Number(row?.['seats'] ?? 0);

  return {
    flights: Number(row?.['flights'] ?? 0),
    landed,
    cancelled: Number(row?.['cancelled'] ?? 0),
    pax,
    loadFactor: seats > 0 ? pax / seats : 0,
    onTimePercent: landed > 0 ? (Number(row?.['on_time'] ?? 0) / landed) * 100 : 0,
  };
}
