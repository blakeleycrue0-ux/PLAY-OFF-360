import { formatMoney, toEuros, type Instant, type Money, type WorldId } from '@airline/shared';
import {
  airlineSummaries,
  reconcileAirlineCash,
  worldTotals,
  type AirlineSummary,
  type Pool,
} from '@airline/db';
import type { SimulationStats } from './simulate.js';

export interface ScenarioReport {
  readonly worldId: WorldId;
  readonly from: Instant;
  readonly to: Instant;
  readonly simulation: SimulationStats;
  readonly totals: Awaited<ReturnType<typeof worldTotals>>;
  readonly airlines: readonly AirlineSummary[];
  /** Aerolíneas cuya caja no cuadra con el ledger. Debe estar vacío siempre. */
  readonly reconciliationFailures: readonly { readonly name: string; readonly drift: Money }[];
  readonly profitable: number;
  readonly lossMaking: number;
}

export async function buildReport(
  pool: Pool,
  worldId: WorldId,
  from: Instant,
  to: Instant,
  simulation: SimulationStats,
): Promise<ScenarioReport> {
  const [totals, airlines] = await Promise.all([
    worldTotals(pool, worldId, from, to),
    airlineSummaries(pool, worldId, from, to),
  ]);

  const reconciliationFailures: { name: string; drift: Money }[] = [];
  for (const airline of airlines) {
    const reconciliation = await reconcileAirlineCash(pool, airline.airlineId);
    if (reconciliation.drift !== 0) {
      reconciliationFailures.push({ name: airline.name, drift: reconciliation.drift });
    }
  }

  return {
    worldId,
    from,
    to,
    simulation,
    totals,
    airlines,
    reconciliationFailures,
    profitable: airlines.filter((a) => a.ledgerBalance > 0).length,
    lossMaking: airlines.filter((a) => a.ledgerBalance <= 0).length,
  };
}

const pad = (value: string, width: number): string => value.padEnd(width).slice(0, width);
const padStart = (value: string, width: number): string => value.padStart(width).slice(-width);

/** Informe legible en consola. Es la salida de `pnpm simulation:run`. */
export function formatReport(report: ScenarioReport): string {
  const lines: string[] = [];
  const { totals, simulation } = report;

  lines.push('');
  lines.push('══════════════════════════════════════════════════════════════════════════════');
  lines.push('  SIMULACIÓN COMPLETADA');
  lines.push('══════════════════════════════════════════════════════════════════════════════');
  lines.push('');
  lines.push(
    `  Trabajos procesados   ${simulation.processed} en ${simulation.iterations} saltos de reloj`,
  );
  lines.push(`    salidas             ${simulation.byKind.flight_departure}`);
  lines.push(`    llegadas            ${simulation.byKind.flight_arrival}`);
  lines.push(`    materializaciones   ${simulation.byKind.schedule_materialize}`);
  lines.push(`    cierres diarios     ${simulation.byKind.daily_close}`);
  lines.push(`  Trabajos fallidos     ${simulation.failed}`);
  lines.push(`  Motivo de parada      ${simulation.stoppedBecause}`);
  lines.push('');
  lines.push(`  Vuelos programados    ${totals.flights}`);
  lines.push(`  Vuelos aterrizados    ${totals.landed}`);
  lines.push(`  Vuelos cancelados     ${totals.cancelled}`);
  lines.push(`  Pasajeros             ${totals.pax.toLocaleString('es-ES')}`);
  lines.push(`  Ocupación media       ${(totals.loadFactor * 100).toFixed(1)} %`);
  lines.push(`  Puntualidad           ${totals.onTimePercent.toFixed(1)} %`);
  lines.push('');
  lines.push('  ─────────────────────────────────────────────────────────────────────────');
  lines.push(
    `  ${pad('AEROLÍNEA', 26)}${pad('ESTRATEGIA', 16)}${padStart('VUELOS', 7)}${padStart('OCUP.', 7)}${padStart('RESULTADO', 16)}`,
  );
  lines.push('  ─────────────────────────────────────────────────────────────────────────');

  const sorted = [...report.airlines].sort((a, b) => b.ledgerBalance - a.ledgerBalance);
  for (const airline of sorted) {
    lines.push(
      `  ${pad(airline.name, 26)}${pad(airline.strategy ?? 'jugador', 16)}` +
        padStart(String(airline.flightsLanded), 7) +
        padStart(`${(airline.loadFactor * 100).toFixed(0)} %`, 7) +
        padStart(formatMoney(airline.ledgerBalance), 16),
    );
  }

  lines.push('  ─────────────────────────────────────────────────────────────────────────');
  lines.push('');
  lines.push(`  Aerolíneas con saldo positivo   ${report.profitable} / ${report.airlines.length}`);
  lines.push(`  Aerolíneas en pérdidas          ${report.lossMaking} / ${report.airlines.length}`);
  lines.push('');

  if (report.reconciliationFailures.length === 0) {
    lines.push('  ✓ La caja de todas las aerolíneas cuadra exactamente con su ledger.');
  } else {
    lines.push('  ✗ CAJA DESCUADRADA — hay un error en el sistema contable:');
    for (const failure of report.reconciliationFailures) {
      lines.push(`      ${failure.name}: ${toEuros(failure.drift).toFixed(2)} € de desviación`);
    }
  }

  lines.push('');
  return lines.join('\n');
}
