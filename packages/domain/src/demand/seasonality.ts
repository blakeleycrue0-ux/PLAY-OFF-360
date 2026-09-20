import { utcDayOfWeek, utcMonth, type Instant } from '@airline/shared';
import type { BalanceConfig, DemandSegment } from '@airline/config';
import type { Airport } from '../entities/airport.js';

/**
 * Estacionalidad de un par origen-destino.
 *
 * Cada aeropuerto trae doce multiplicadores mensuales. El del par es la media
 * geométrica de ambos: un destino de ocio muy estacional arrastra al par hacia
 * arriba en verano sin que un origen plano lo anule del todo. Es lo que hace
 * que Mallorca en julio sea otro mercado que Mallorca en febrero
 * (docs/04 §4.1).
 *
 * La media geométrica es una derivación propia: los documentos piden el efecto
 * pero no fijan cómo combinar los dos extremos de la ruta.
 */
export function seasonalityFor(origin: Airport, destination: Airport, at: Instant): number {
  const month = utcMonth(at);
  const o = origin.seasonality[month - 1] ?? 1;
  const d = destination.seasonality[month - 1] ?? 1;
  return Math.sqrt(o * d);
}

/** Perfil semanal por segmento (docs/04 §4.1: business hace pico lunes y jueves). */
export function dayOfWeekFactor(
  segment: DemandSegment,
  at: Instant,
  config: BalanceConfig,
): number {
  const profile = config.demand.dayOfWeekProfile[segment];
  return profile[utcDayOfWeek(at)] ?? 1;
}
