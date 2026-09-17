import { instant, type Instant } from '@airline/shared';
import type { World } from '../entities/world.js';

/**
 * Conversión entre tiempo real y tiempo del mundo (ADR-001).
 *
 * Con `timeScale = 1` ambos coinciden exactamente, que es el caso del MVP. La
 * conversión existe igualmente, y **toda** la aritmética temporal del sistema
 * pasa por aquí, para que cambiar la velocidad de un mundo sea cambiar una
 * fila y no rehacer el motor.
 *
 * Reparto de responsabilidades:
 * - Los vuelos, las plantillas y los cierres viven en **tiempo del mundo**.
 * - La cola de trabajos programa en **tiempo real**: es cuándo debe despertar
 *   el proceso. `realTimeFor()` es el puente entre ambos.
 */
export function worldTimeAt(world: World, realNow: Instant): Instant {
  return instant(world.startedAt + Math.round((realNow - world.startedAt) * world.timeScale));
}

export function realTimeFor(world: World, worldTime: Instant): Instant {
  return instant(world.startedAt + Math.round((worldTime - world.startedAt) / world.timeScale));
}

/** Duración equivalente en tiempo real de una duración del mundo, en ms. */
export function realDurationOf(world: World, worldMillis: number): number {
  return worldMillis / world.timeScale;
}
