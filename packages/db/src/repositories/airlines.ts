import type { Airline } from '@airline/domain';
import type { AirlineId, WorldId } from '@airline/shared';
import { toDbTimestamp } from '../mappers/common.js';
import { toAirline } from '../mappers/entities.js';
import { exactlyOne, type Queryable } from '../pool.js';

const COLUMNS = `
  id, world_id, account_id, name, iata_code, icao_code, country, hub, business_model,
  controller, npc_strategy, cash_cents, reputation, on_time_rate, founded_at, is_active`;

export async function insertAirline(db: Queryable, airline: Airline): Promise<Airline> {
  const result = await db.query(
    `INSERT INTO airlines (
       id, world_id, account_id, name, iata_code, icao_code, country, hub, business_model,
       controller, npc_strategy, cash_cents, reputation, on_time_rate, founded_at, is_active
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
     RETURNING ${COLUMNS}`,
    [
      airline.id,
      airline.worldId,
      airline.accountId,
      airline.name,
      airline.iataCode,
      airline.icaoCode,
      airline.country,
      airline.hub,
      airline.businessModel,
      airline.controller,
      airline.npcStrategy,
      airline.cash,
      airline.reputation,
      airline.onTimeRate,
      toDbTimestamp(airline.foundedAt),
      airline.isActive,
    ],
  );
  return toAirline(exactlyOne(result.rows, 'airlines'));
}

export async function findAirline(db: Queryable, id: AirlineId): Promise<Airline | null> {
  const result = await db.query(`SELECT ${COLUMNS} FROM airlines WHERE id = $1`, [id]);
  const row = result.rows[0];
  return row === undefined ? null : toAirline(row);
}

export async function listAirlines(db: Queryable, worldId: WorldId): Promise<readonly Airline[]> {
  const result = await db.query(
    `SELECT ${COLUMNS} FROM airlines WHERE world_id = $1 AND is_active ORDER BY name`,
    [worldId],
  );
  return result.rows.map(toAirline);
}

/**
 * Actualiza reputación y puntualidad.
 *
 * La caja **no** se toca aquí: sólo la mueve el ledger (ADR-007). Que este
 * repositorio no tenga ninguna función para modificar `cash_cents` es
 * deliberado.
 */
export async function updateAirlinePerformance(
  db: Queryable,
  id: AirlineId,
  values: { readonly reputation: number; readonly onTimeRate: number },
): Promise<void> {
  await db.query(`UPDATE airlines SET reputation = $2, on_time_rate = $3 WHERE id = $1`, [
    id,
    values.reputation,
    values.onTimeRate,
  ]);
}
