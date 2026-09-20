import type { Instant, WorldId } from '@airline/shared';

export const WORLD_STATUSES = ['open', 'full', 'archived'] as const;
export type WorldStatus = (typeof WORLD_STATUSES)[number];

/**
 * Un mundo es un shard: un universo compartido e independiente (docs/05 §5.2).
 *
 * `timeScale` existe desde el primer día aunque el MVP corra a 1:1 (ADR-001).
 * Toda conversión entre tiempo real y tiempo del mundo pasa por `WorldClock`,
 * nunca por aritmética suelta sobre instantes.
 */
export interface World {
  readonly id: WorldId;
  readonly name: string;
  /** Semilla de todo sorteo del mundo. Hace la simulación reproducible. */
  readonly seed: number;
  readonly timeScale: number;
  /** Instante real en el que arrancó el mundo; origen del tiempo del mundo. */
  readonly startedAt: Instant;
  readonly configVersion: string;
  readonly fuelPriceCentsPerKg: number;
  readonly status: WorldStatus;
}
