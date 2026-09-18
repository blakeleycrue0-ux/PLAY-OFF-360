import type { World } from '@airline/domain';
import type { WorldId } from '@airline/shared';
import { toDbTimestamp } from '../mappers/common.js';
import { toWorld } from '../mappers/entities.js';
import { exactlyOne, type Queryable } from '../pool.js';

const COLUMNS = `id, name, seed, time_scale, started_at, config_version, fuel_price_cents_per_kg, status`;

export async function insertWorld(db: Queryable, world: World): Promise<World> {
  const result = await db.query(
    `INSERT INTO worlds (id, name, seed, time_scale, started_at, config_version, fuel_price_cents_per_kg, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING ${COLUMNS}`,
    [
      world.id,
      world.name,
      world.seed,
      world.timeScale,
      toDbTimestamp(world.startedAt),
      world.configVersion,
      world.fuelPriceCentsPerKg,
      world.status,
    ],
  );
  return toWorld(exactlyOne(result.rows, 'worlds'));
}

export async function findWorld(db: Queryable, id: WorldId): Promise<World | null> {
  const result = await db.query(`SELECT ${COLUMNS} FROM worlds WHERE id = $1`, [id]);
  const row = result.rows[0];
  return row === undefined ? null : toWorld(row);
}

export async function listOpenWorlds(db: Queryable): Promise<readonly World[]> {
  const result = await db.query(
    `SELECT ${COLUMNS} FROM worlds WHERE status = 'open' ORDER BY started_at`,
  );
  return result.rows.map(toWorld);
}

export async function updateFuelPrice(
  db: Queryable,
  id: WorldId,
  centsPerKg: number,
): Promise<void> {
  await db.query('UPDATE worlds SET fuel_price_cents_per_kg = $2 WHERE id = $1', [id, centsPerKg]);
}
