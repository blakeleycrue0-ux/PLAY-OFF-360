import type { Route } from '@airline/domain';
import type { AirlineId, AirportCode, Instant, RouteId, WorldId } from '@airline/shared';
import { toDbTimestamp } from '../mappers/common.js';
import { toRoute } from '../mappers/entities.js';
import { exactlyOne, type Queryable } from '../pool.js';

const COLUMNS = `id, world_id, airline_id, origin, destination, distance_km, prices, service_level, status`;

export async function insertRoute(db: Queryable, route: Route, openedAt: Instant): Promise<Route> {
  const result = await db.query(
    `INSERT INTO routes (id, world_id, airline_id, origin, destination, distance_km, prices, service_level, status, opened_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10)
     RETURNING ${COLUMNS}`,
    [
      route.id,
      route.worldId,
      route.airlineId,
      route.origin,
      route.destination,
      route.distanceKm,
      JSON.stringify(route.prices),
      route.serviceLevel,
      route.status,
      toDbTimestamp(openedAt),
    ],
  );
  return toRoute(exactlyOne(result.rows, 'routes'));
}

export async function findRoute(db: Queryable, id: RouteId): Promise<Route | null> {
  const result = await db.query(`SELECT ${COLUMNS} FROM routes WHERE id = $1`, [id]);
  const row = result.rows[0];
  return row === undefined ? null : toRoute(row);
}

export async function listRoutes(db: Queryable, airlineId: AirlineId): Promise<readonly Route[]> {
  const result = await db.query(
    `SELECT ${COLUMNS} FROM routes WHERE airline_id = $1 AND status <> 'closed' ORDER BY origin, destination`,
    [airlineId],
  );
  return result.rows.map(toRoute);
}

/**
 * Todas las rutas activas que sirven un par origen-destino, de cualquier
 * aerolínea. Es la consulta que define el mercado de ese par y de la que parte
 * el reparto de demanda entre competidores.
 */
export async function findMarketRoutes(
  db: Queryable,
  worldId: WorldId,
  origin: AirportCode,
  destination: AirportCode,
): Promise<readonly Route[]> {
  const result = await db.query(
    `SELECT ${COLUMNS} FROM routes
     WHERE world_id = $1 AND origin = $2 AND destination = $3 AND status = 'active'`,
    [worldId, origin, destination],
  );
  return result.rows.map(toRoute);
}

export async function updateRoutePricing(
  db: Queryable,
  id: RouteId,
  prices: Route['prices'],
  serviceLevel: number,
): Promise<void> {
  await db.query(`UPDATE routes SET prices = $2::jsonb, service_level = $3 WHERE id = $1`, [
    id,
    JSON.stringify(prices),
    serviceLevel,
  ]);
}
