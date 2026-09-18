import { addDays, money, toEuros } from '@airline/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Pool } from '../pool.js';
import { withTransaction } from '../pool.js';
import { makeAirline, makeWorld, T0 } from '../testing/factories.js';
import { createTestPool, truncateGameData } from '../testing/test-db.js';
import { idempotencyKey } from './categories.js';
import {
  ledgerBalance,
  postLedgerEntries,
  profitAndLossByCategory,
  reconcileAirlineCash,
  type LedgerEntryInput,
} from './ledger.js';

let pool: Pool;

beforeAll(() => {
  pool = createTestPool();
});

afterAll(async () => {
  await pool.end();
});

beforeEach(async () => {
  await truncateGameData(pool);
});

async function fixture(): Promise<{
  world: Awaited<ReturnType<typeof makeWorld>>;
  airline: Awaited<ReturnType<typeof makeAirline>>;
}> {
  const world = await makeWorld(pool);
  const airline = await makeAirline(pool, world, { cash: money(0) });
  return { world, airline };
}

function entry(
  world: { id: LedgerEntryInput['worldId'] },
  airline: { id: LedgerEntryInput['airlineId'] },
  overrides: Partial<LedgerEntryInput> = {},
): LedgerEntryInput {
  return {
    worldId: world.id,
    airlineId: airline.id,
    occurredAt: T0,
    category: 'ticket_revenue',
    amount: money(100_000),
    idempotencyKey: 'test:1:ticket_revenue',
    ...overrides,
  };
}

describe('ledger', () => {
  it('asienta un movimiento y mueve la caja materializada', async () => {
    const { world, airline } = await fixture();

    const result = await withTransaction(pool, (tx) =>
      postLedgerEntries(tx, [entry(world, airline)]),
    );

    expect(result.inserted).toBe(1);
    expect(result.skipped).toBe(0);
    expect(await ledgerBalance(pool, airline.id)).toBe(100_000);

    const reconciliation = await reconcileAirlineCash(pool, airline.id);
    expect(reconciliation.materialized).toBe(100_000);
    expect(reconciliation.drift).toBe(0);
  });

  it('suma ingresos y gastos con el signo correcto', async () => {
    const { world, airline } = await fixture();

    await withTransaction(pool, (tx) =>
      postLedgerEntries(tx, [
        entry(world, airline, { idempotencyKey: 'k:revenue', amount: money(500_000) }),
        entry(world, airline, {
          idempotencyKey: 'k:fuel',
          category: 'fuel',
          amount: money(-300_000),
        }),
        entry(world, airline, {
          idempotencyKey: 'k:crew',
          category: 'crew',
          amount: money(-120_000),
        }),
      ]),
    );

    expect(await ledgerBalance(pool, airline.id)).toBe(80_000);
    expect((await reconcileAirlineCash(pool, airline.id)).drift).toBe(0);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Idempotencia. Es la propiedad más importante de todo el sistema: un job
  // reintentado no puede crear dinero de la nada.
  // ─────────────────────────────────────────────────────────────────────────

  it('IDEMPOTENCIA: reintentar el mismo asiento no duplica el dinero', async () => {
    const { world, airline } = await fixture();
    const movement = entry(world, airline, {
      idempotencyKey: idempotencyKey.flightCost('f1', 'fuel'),
    });

    const first = await withTransaction(pool, (tx) => postLedgerEntries(tx, [movement]));
    const second = await withTransaction(pool, (tx) => postLedgerEntries(tx, [movement]));
    const third = await withTransaction(pool, (tx) => postLedgerEntries(tx, [movement]));

    expect(first.inserted).toBe(1);
    expect(second).toMatchObject({ inserted: 0, skipped: 1 });
    expect(third).toMatchObject({ inserted: 0, skipped: 1 });

    expect(await ledgerBalance(pool, airline.id)).toBe(100_000);
    expect((await reconcileAirlineCash(pool, airline.id)).drift).toBe(0);
  });

  it('IDEMPOTENCIA: un lote reintentado a medias sólo asienta lo que falta', async () => {
    const { world, airline } = await fixture();
    const a = entry(world, airline, { idempotencyKey: 'batch:a', amount: money(10_000) });
    const b = entry(world, airline, {
      idempotencyKey: 'batch:b',
      amount: money(-4_000),
      category: 'fuel',
    });

    await withTransaction(pool, (tx) => postLedgerEntries(tx, [a]));
    const retry = await withTransaction(pool, (tx) => postLedgerEntries(tx, [a, b]));

    expect(retry).toMatchObject({ inserted: 1, skipped: 1 });
    expect(await ledgerBalance(pool, airline.id)).toBe(6_000);
  });

  it('IDEMPOTENCIA: la misma clave con distinta fecha tampoco duplica', async () => {
    // Esta es la razón de que exista `ledger_idempotency` sin particionar: un
    // UNIQUE sobre la tabla particionada sólo garantiza unicidad dentro de la
    // partición, y un reintento con otra fecha caería en otro mes (ADR-007).
    const { world, airline } = await fixture();
    const key = 'cross:partition:key';

    await withTransaction(pool, (tx) =>
      postLedgerEntries(tx, [entry(world, airline, { idempotencyKey: key, occurredAt: T0 })]),
    );
    const retry = await withTransaction(pool, (tx) =>
      postLedgerEntries(tx, [
        entry(world, airline, { idempotencyKey: key, occurredAt: addDays(T0, 60) }),
      ]),
    );

    expect(retry.inserted).toBe(0);
    expect(await ledgerBalance(pool, airline.id)).toBe(100_000);
  });

  it('la transacción es atómica: si el llamante falla, no queda rastro', async () => {
    const { world, airline } = await fixture();

    await expect(
      withTransaction(pool, async (tx) => {
        await postLedgerEntries(tx, [entry(world, airline, { idempotencyKey: 'rollback:test' })]);
        throw new Error('fallo posterior del manejador');
      }),
    ).rejects.toThrow('fallo posterior');

    expect(await ledgerBalance(pool, airline.id)).toBe(0);
    expect((await reconcileAirlineCash(pool, airline.id)).drift).toBe(0);

    // Y la clave queda libre: el trabajo puede reintentarse de verdad.
    const retry = await withTransaction(pool, (tx) =>
      postLedgerEntries(tx, [entry(world, airline, { idempotencyKey: 'rollback:test' })]),
    );
    expect(retry.inserted).toBe(1);
  });

  it('rechaza claves repetidas dentro del mismo lote', async () => {
    const { world, airline } = await fixture();
    await expect(
      withTransaction(pool, (tx) =>
        postLedgerEntries(tx, [
          entry(world, airline, { idempotencyKey: 'dup' }),
          entry(world, airline, { idempotencyKey: 'dup' }),
        ]),
      ),
    ).rejects.toThrow(/repetida/);
  });

  it('rechaza asientos de importe cero', async () => {
    const { world, airline } = await fixture();
    await expect(
      withTransaction(pool, (tx) =>
        postLedgerEntries(tx, [entry(world, airline, { amount: money(0) })]),
      ),
    ).rejects.toThrow(/importe cero/);
  });

  it('un lote vacío no hace nada', async () => {
    const result = await withTransaction(pool, (tx) => postLedgerEntries(tx, []));
    expect(result).toMatchObject({ inserted: 0, skipped: 0 });
  });

  it('mantiene la caja exacta tras mil movimientos', async () => {
    const { world, airline } = await fixture();

    const entries = Array.from({ length: 1_000 }, (_, i) =>
      entry(world, airline, {
        idempotencyKey: `bulk:${i}`,
        amount: money(i % 2 === 0 ? 7 : -3),
        category: i % 2 === 0 ? 'ticket_revenue' : 'fuel',
      }),
    );

    await withTransaction(pool, (tx) => postLedgerEntries(tx, entries));

    // 500 × 7 − 500 × 3 = 2.000 céntimos, exactos.
    expect(await ledgerBalance(pool, airline.id)).toBe(2_000);
    expect((await reconcileAirlineCash(pool, airline.id)).drift).toBe(0);
    expect(toEuros(await ledgerBalance(pool, airline.id))).toBe(20);
  });

  it('agrupa el resultado por categoría', async () => {
    const { world, airline } = await fixture();

    await withTransaction(pool, (tx) =>
      postLedgerEntries(tx, [
        entry(world, airline, {
          idempotencyKey: 'p:1',
          category: 'ticket_revenue',
          amount: money(900_000),
        }),
        entry(world, airline, { idempotencyKey: 'p:2', category: 'fuel', amount: money(-400_000) }),
        entry(world, airline, { idempotencyKey: 'p:3', category: 'fuel', amount: money(-100_000) }),
      ]),
    );

    const pnl = await profitAndLossByCategory(pool, airline.id, T0, addDays(T0, 1));
    const fuel = pnl.find((c) => c.category === 'fuel');

    expect(fuel).toMatchObject({ total: -500_000, entries: 2 });
    expect(pnl.find((c) => c.category === 'ticket_revenue')?.total).toBe(900_000);
  });

  it('aísla las cuentas de aerolíneas distintas', async () => {
    const world = await makeWorld(pool);
    const a = await makeAirline(pool, world, { cash: money(0) });
    const b = await makeAirline(pool, world, { cash: money(0) });

    await withTransaction(pool, (tx) =>
      postLedgerEntries(tx, [
        entry(world, a, { idempotencyKey: 'iso:a', amount: money(50_000) }),
        entry(world, b, { idempotencyKey: 'iso:b', amount: money(-20_000), category: 'fuel' }),
      ]),
    );

    expect(await ledgerBalance(pool, a.id)).toBe(50_000);
    expect(await ledgerBalance(pool, b.id)).toBe(-20_000);
  });
});
