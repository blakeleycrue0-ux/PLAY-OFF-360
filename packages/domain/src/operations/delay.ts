import { diffMinutes, minutes, type Instant, type Minutes, type Rng } from '@airline/shared';
import type { BalanceConfig } from '@airline/config';

export interface DelayInput {
  readonly scheduledDeparture: Instant;
  /** Cuándo queda libre el avión: recoge el retraso del vuelo anterior. */
  readonly aircraftAvailableAt: Instant;
  /** Fiabilidad efectiva del avión, 0..1. */
  readonly reliability: number;
}

export interface DelayBreakdown {
  /** Arrastre del vuelo anterior del mismo avión. Es el retraso que se propaga. */
  readonly rotation: Minutes;
  readonly technical: Minutes;
  /** No se modela en la Fase 1: requiere eventos de mundo (docs/06 §6.5). */
  readonly weather: Minutes;
  /** No se modela en la Fase 1: requiere capacidad de aeropuerto y slots. */
  readonly congestion: Minutes;
  /** No se modela en la Fase 1: requiere plantillas de personal. */
  readonly crew: Minutes;
  readonly total: Minutes;
}

/**
 * Retraso de salida (docs/03 §3.6).
 *
 * La pieza que hace interesante la programación es `rotation`: si el avión
 * llegó tarde de su vuelo anterior, sale tarde en éste, y el retraso recorre
 * toda la cadena del día. Apretar las rotaciones maximiza la utilización de la
 * flota y destroza la puntualidad al primer contratiempo. Esa tensión no está
 * programada como mecánica: emerge del modelo.
 *
 * El retraso técnico usa la fiabilidad efectiva como probabilidad, de modo que
 * diferir mantenimiento se paga en puntualidad sin necesidad de inventar una
 * constante nueva. El sorteo va sembrado: el mismo vuelo da siempre el mismo
 * resultado y puede recalcularse para auditarlo.
 */
export function calculateDepartureDelay(
  input: DelayInput,
  config: BalanceConfig,
  rng: Rng,
): DelayBreakdown {
  const rotationMinutes = Math.max(
    0,
    diffMinutes(input.scheduledDeparture, input.aircraftAvailableAt),
  );

  const failureProbability = Math.max(0, 1 - input.reliability);
  const technicalMinutes =
    rng() < failureProbability ? rng() * config.delays.technicalMaxMinutes : 0;

  const rotation = minutes(Math.round(rotationMinutes));
  const technical = minutes(Math.round(technicalMinutes));

  return {
    rotation,
    technical,
    weather: minutes(0),
    congestion: minutes(0),
    crew: minutes(0),
    total: minutes(rotation + technical),
  };
}

export function isOnTime(delayMinutes: Minutes, config: BalanceConfig): boolean {
  return delayMinutes <= config.delays.onTimeThresholdMinutes;
}
