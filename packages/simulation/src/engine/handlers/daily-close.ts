import {
  addDays,
  negateMoney,
  startOfUtcDay,
  utcDateKey,
  type Instant,
  type WorldId,
} from '@airline/shared';
import { calculateDailyFixedCost } from '@airline/domain';
import {
  aircraftRepo,
  airlinesRepo,
  dedupeKey,
  enqueueJob,
  idempotencyKey,
  postLedgerEntries,
  reconcileAirlineCash,
  type LedgerEntryInput,
  type PoolClient,
} from '@airline/db';
import type { EngineContext } from '../context.js';

export interface DailyClosePayload {
  readonly worldId: WorldId;
}

export interface DailyCloseOutcome {
  readonly airlines: number;
  readonly aircraft: number;
  readonly entriesPosted: number;
  /** Aerolíneas cuya caja no cuadraba con el ledger. Debe ser siempre cero. */
  readonly reconciliationFailures: number;
}

/**
 * Cierre diario: los costes que se pagan vuele o no vuele el avión.
 *
 * Es la mitad de la economía que hace que el juego no sea un clicker. Un avión
 * parado sigue costando su cuota de leasing y su parte de estructura, así que
 * comprar flota sin red que la haga volar es la forma más rápida de arruinarse
 * (docs/04 §4.4).
 *
 * Aprovecha para reconciliar la caja materializada de cada aerolínea contra la
 * suma de su ledger. La desviación debe ser cero; si no lo es, hay un error y
 * se registra.
 */
export async function handleDailyClose(
  ctx: EngineContext,
  tx: PoolClient,
  payload: DailyClosePayload,
  jobRunAt: Instant,
): Promise<DailyCloseOutcome> {
  const day = startOfUtcDay(jobRunAt);
  const dayKey = utcDateKey(day);

  const airlines = await airlinesRepo.listAirlines(tx, payload.worldId);
  const entries: LedgerEntryInput[] = [];
  let aircraftCount = 0;

  for (const airline of airlines) {
    const fleet = await aircraftRepo.listFleet(tx, airline.id);
    aircraftCount += fleet.length;

    for (const aircraft of fleet) {
      const fixed = calculateDailyFixedCost(aircraft.leaseRate, ctx.config);

      if (fixed.lease !== 0) {
        entries.push({
          worldId: payload.worldId,
          airlineId: airline.id,
          occurredAt: day,
          category: 'lease',
          amount: negateMoney(fixed.lease),
          idempotencyKey: idempotencyKey.lease(aircraft.id, dayKey),
          aircraftId: aircraft.id,
          description: `Leasing diario ${aircraft.registration} ${dayKey}`,
        });
      }

      if (fixed.overhead !== 0) {
        entries.push({
          worldId: payload.worldId,
          airlineId: airline.id,
          occurredAt: day,
          category: 'overhead',
          amount: negateMoney(fixed.overhead),
          idempotencyKey: idempotencyKey.overhead(aircraft.id, dayKey),
          aircraftId: aircraft.id,
          description: `Estructura diaria ${aircraft.registration} ${dayKey}`,
        });
      }
    }
  }

  const posted = await postLedgerEntries(tx, entries);

  let reconciliationFailures = 0;
  for (const airline of airlines) {
    const reconciliation = await reconcileAirlineCash(tx, airline.id);
    if (reconciliation.drift !== 0) {
      reconciliationFailures += 1;
      ctx.logger.error('La caja no cuadra con el ledger', {
        airlineId: airline.id,
        materialized: reconciliation.materialized,
        ledger: reconciliation.ledger,
        drift: reconciliation.drift,
      });
    }
  }

  const nextDay = addDays(day, 1);
  await enqueueJob(tx, {
    worldId: payload.worldId,
    kind: 'daily_close',
    runAt: nextDay,
    dedupeKey: dedupeKey.dailyClose(payload.worldId, utcDateKey(nextDay)),
    payload: { worldId: payload.worldId },
  });

  return {
    airlines: airlines.length,
    aircraft: aircraftCount,
    entriesPosted: posted.inserted,
    reconciliationFailures,
  };
}
