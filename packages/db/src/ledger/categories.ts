/** Categorías contables. Coinciden con el CHECK de la migración 0005. */
export const LEDGER_CATEGORIES = [
  'ticket_revenue',
  'ancillary_revenue',
  'fuel',
  'crew',
  'maintenance',
  'landing_fee',
  'passenger_fee',
  'handling',
  'navigation',
  'catering',
  'lease',
  'overhead',
  'aircraft_purchase',
  'aircraft_sale',
  'founding_capital',
] as const;

export type LedgerCategory = (typeof LEDGER_CATEGORIES)[number];

export const REVENUE_CATEGORIES: readonly LedgerCategory[] = [
  'ticket_revenue',
  'ancillary_revenue',
  'aircraft_sale',
  'founding_capital',
];

/**
 * Claves de idempotencia.
 *
 * El formato es `<dominio>:<id>:<concepto>[:<periodo>]` y es **determinista**:
 * el mismo suceso produce siempre la misma clave, que es lo que convierte un
 * reintento en un no-op (ADR-007).
 */
export const idempotencyKey = {
  flightCost: (flightId: string, category: LedgerCategory): string =>
    `flight:${flightId}:${category}`,
  flightRevenue: (flightId: string, category: LedgerCategory): string =>
    `flight:${flightId}:${category}`,
  lease: (aircraftId: string, monthKey: string): string => `lease:${aircraftId}:${monthKey}`,
  overhead: (aircraftId: string, dayKey: string): string => `overhead:${aircraftId}:${dayKey}`,
  aircraftPurchase: (aircraftId: string): string => `aircraft:${aircraftId}:purchase`,
  foundingCapital: (airlineId: string): string => `airline:${airlineId}:founding_capital`,
} as const;
