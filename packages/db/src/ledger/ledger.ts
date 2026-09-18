import {
  InvariantError,
  money,
  sumMoney,
  type AircraftId,
  type AirlineId,
  type FlightId,
  type Instant,
  type Money,
  type RouteId,
  type WorldId,
} from '@airline/shared';
import { toDbTimestamp } from '../mappers/common.js';
import type { Queryable } from '../pool.js';
import type { LedgerCategory } from './categories.js';

export interface LedgerEntryInput {
  readonly worldId: WorldId;
  readonly airlineId: AirlineId;
  readonly occurredAt: Instant;
  readonly category: LedgerCategory;
  /** Positivo ingreso, negativo gasto. Nunca cero. */
  readonly amount: Money;
  readonly idempotencyKey: string;
  readonly flightId?: FlightId;
  readonly aircraftId?: AircraftId;
  readonly routeId?: RouteId;
  readonly description?: string;
}

export interface PostResult {
  readonly inserted: number;
  /** Asientos que ya existían: el trabajo se está reintentando. */
  readonly skipped: number;
  readonly cashDelta: ReadonlyMap<AirlineId, Money>;
}

/**
 * Asienta movimientos de dinero de forma idempotente.
 *
 * Éste es el punto más delicado del sistema, y la mecánica exacta importa:
 *
 * 1. Las claves entran primero en `ledger_idempotency`, que **no** está
 *    particionada, con `ON CONFLICT DO NOTHING RETURNING`. Lo que vuelve es el
 *    conjunto de claves que este intento ha reclamado de verdad.
 * 2. Sólo se asientan los movimientos cuya clave se ha reclamado.
 * 3. La caja materializada se ajusta **únicamente** con la suma de lo asentado.
 *
 * Un reintento no reclama ninguna clave, luego no asienta nada y no mueve caja.
 * La garantía no la da JavaScript: la da una restricción de PostgreSQL dentro
 * de la misma transacción (ADR-007).
 *
 * Debe llamarse dentro de una transacción. Si el llamante falla después, todo
 * —incluida la reclamación de claves— se deshace junto.
 */
export async function postLedgerEntries(
  tx: Queryable,
  entries: readonly LedgerEntryInput[],
): Promise<PostResult> {
  if (entries.length === 0) {
    return { inserted: 0, skipped: 0, cashDelta: new Map() };
  }

  assertNoDuplicateKeys(entries);
  assertNoZeroAmounts(entries);

  const claimed = await claimIdempotencyKeys(tx, entries);
  const pending = entries.filter((e) => claimed.has(e.idempotencyKey));

  if (pending.length === 0) {
    return { inserted: 0, skipped: entries.length, cashDelta: new Map() };
  }

  await insertEntries(tx, pending);
  const cashDelta = await applyCashDelta(tx, pending);

  return { inserted: pending.length, skipped: entries.length - pending.length, cashDelta };
}

function assertNoDuplicateKeys(entries: readonly LedgerEntryInput[]): void {
  const seen = new Set<string>();
  for (const entry of entries) {
    if (seen.has(entry.idempotencyKey)) {
      throw new InvariantError(
        `Clave de idempotencia repetida dentro del mismo lote: ${entry.idempotencyKey}`,
      );
    }
    seen.add(entry.idempotencyKey);
  }
}

function assertNoZeroAmounts(entries: readonly LedgerEntryInput[]): void {
  for (const entry of entries) {
    if (entry.amount === 0) {
      throw new InvariantError(
        `Asiento de importe cero (${entry.category}, ${entry.idempotencyKey}): un movimiento que no mueve dinero no es un movimiento.`,
      );
    }
  }
}

async function claimIdempotencyKeys(
  tx: Queryable,
  entries: readonly LedgerEntryInput[],
): Promise<ReadonlySet<string>> {
  const values: unknown[] = [];
  const tuples = entries.map((entry, index) => {
    const base = index * 3;
    values.push(entry.worldId, entry.idempotencyKey, toDbTimestamp(entry.occurredAt));
    return `($${base + 1}::uuid, $${base + 2}::text, $${base + 3}::timestamptz)`;
  });

  const result = await tx.query<{ idempotency_key: string }>(
    `INSERT INTO ledger_idempotency (world_id, idempotency_key, occurred_at)
     VALUES ${tuples.join(', ')}
     ON CONFLICT (world_id, idempotency_key) DO NOTHING
     RETURNING idempotency_key`,
    values,
  );

  return new Set(result.rows.map((row) => row.idempotency_key));
}

async function insertEntries(tx: Queryable, entries: readonly LedgerEntryInput[]): Promise<void> {
  const values: unknown[] = [];
  const tuples = entries.map((entry, index) => {
    const base = index * 10;
    values.push(
      entry.worldId,
      entry.airlineId,
      toDbTimestamp(entry.occurredAt),
      entry.category,
      entry.amount,
      entry.flightId ?? null,
      entry.aircraftId ?? null,
      entry.routeId ?? null,
      entry.description ?? null,
      entry.idempotencyKey,
    );
    return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}, $${base + 10})`;
  });

  // `entries` ya viene filtrado a las claves que esta transacción ha
  // reclamado, así que es una inserción directa. La clave se repite en la fila
  // para que la restricción única de la partición actúe como segunda línea de
  // defensa frente a un fallo de la primera.
  await tx.query(
    `INSERT INTO ledger_entries
       (world_id, airline_id, occurred_at, category, amount_cents,
        flight_id, aircraft_id, route_id, description, idempotency_key)
     VALUES ${tuples.join(', ')}`,
    values,
  );
}

async function applyCashDelta(
  tx: Queryable,
  entries: readonly LedgerEntryInput[],
): Promise<ReadonlyMap<AirlineId, Money>> {
  const byAirline = new Map<AirlineId, Money[]>();
  for (const entry of entries) {
    const bucket = byAirline.get(entry.airlineId) ?? [];
    bucket.push(entry.amount);
    byAirline.set(entry.airlineId, bucket);
  }

  const deltas = new Map<AirlineId, Money>();
  for (const [airlineId, amounts] of byAirline) {
    const delta = sumMoney(amounts);
    deltas.set(airlineId, delta);
    await tx.query('UPDATE airlines SET cash_cents = cash_cents + $2 WHERE id = $1', [
      airlineId,
      delta,
    ]);
  }

  return deltas;
}

/** Saldo real: la suma del ledger. Es la verdad, frente a la caja materializada. */
export async function ledgerBalance(db: Queryable, airlineId: AirlineId): Promise<Money> {
  const result = await db.query<{ balance: number | null }>(
    'SELECT COALESCE(SUM(amount_cents), 0)::bigint AS balance FROM ledger_entries WHERE airline_id = $1',
    [airlineId],
  );
  return money(result.rows[0]?.balance ?? 0);
}

export interface CashReconciliation {
  readonly airlineId: AirlineId;
  readonly materialized: Money;
  readonly ledger: Money;
  readonly drift: Money;
}

/**
 * Compara la caja materializada con la suma del ledger.
 *
 * La desviación debe ser **cero, siempre**. Cualquier otra cosa es un error de
 * programación, y por eso el arnés de simulación y los tests la comprueban en
 * cada escenario en vez de confiar en que el mecanismo funciona.
 */
export async function reconcileAirlineCash(
  db: Queryable,
  airlineId: AirlineId,
): Promise<CashReconciliation> {
  const result = await db.query<{ cash_cents: number; ledger: number | null }>(
    `SELECT a.cash_cents,
            COALESCE((SELECT SUM(amount_cents) FROM ledger_entries l WHERE l.airline_id = a.id), 0) AS ledger
     FROM airlines a WHERE a.id = $1`,
    [airlineId],
  );

  const row = result.rows[0];
  if (row === undefined) throw new InvariantError(`Aerolínea desconocida: ${airlineId}`);

  const materialized = money(row.cash_cents);
  const ledger = money(row.ledger ?? 0);
  return { airlineId, materialized, ledger, drift: money(materialized - ledger) };
}

export interface CategoryTotal {
  readonly category: LedgerCategory;
  readonly total: Money;
  readonly entries: number;
}

export async function profitAndLossByCategory(
  db: Queryable,
  airlineId: AirlineId,
  from: Instant,
  to: Instant,
): Promise<readonly CategoryTotal[]> {
  const result = await db.query<{ category: LedgerCategory; total: number; entries: number }>(
    `SELECT category, SUM(amount_cents)::bigint AS total, count(*)::int AS entries
     FROM ledger_entries
     WHERE airline_id = $1 AND occurred_at >= $2 AND occurred_at < $3
     GROUP BY category
     ORDER BY SUM(amount_cents) DESC`,
    [airlineId, toDbTimestamp(from), toDbTimestamp(to)],
  );

  return result.rows.map((row) => ({
    category: row.category,
    total: money(row.total),
    entries: row.entries,
  }));
}

export interface RoutePnl {
  readonly routeId: RouteId;
  readonly revenue: Money;
  readonly cost: Money;
  readonly profit: Money;
  readonly entries: number;
}

/**
 * P&L por ruta. Sale gratis porque cada asiento contable lleva su `route_id`:
 * es exactamente la pantalla de docs/04 §4.9, y la que hace que el jugador
 * descubra que su ruta estrella pierde dinero.
 */
export async function profitAndLossByRoute(
  db: Queryable,
  airlineId: AirlineId,
  from: Instant,
  to: Instant,
): Promise<readonly RoutePnl[]> {
  const result = await db.query<{
    route_id: RouteId;
    revenue: number;
    cost: number;
    entries: number;
  }>(
    `SELECT route_id,
            COALESCE(SUM(amount_cents) FILTER (WHERE amount_cents > 0), 0)::bigint AS revenue,
            COALESCE(SUM(-amount_cents) FILTER (WHERE amount_cents < 0), 0)::bigint AS cost,
            count(*)::int AS entries
     FROM ledger_entries
     WHERE airline_id = $1 AND route_id IS NOT NULL AND occurred_at >= $2 AND occurred_at < $3
     GROUP BY route_id
     ORDER BY SUM(amount_cents) DESC`,
    [airlineId, toDbTimestamp(from), toDbTimestamp(to)],
  );

  return result.rows.map((row) => {
    const revenue = money(row.revenue);
    const cost = money(row.cost);
    return {
      routeId: row.route_id,
      revenue,
      cost,
      profit: money(revenue - cost),
      entries: row.entries,
    };
  });
}
