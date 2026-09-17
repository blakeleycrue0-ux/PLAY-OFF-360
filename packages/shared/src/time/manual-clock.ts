import type { Clock } from './clock.js';
import { addMinutes, type Instant, type Minutes } from './instant.js';

/** Reloj controlado a mano: tests y arnés de simulación. */
export class ManualClock implements Clock {
  #current: Instant;

  constructor(start: Instant) {
    this.#current = start;
  }

  now(): Instant {
    return this.#current;
  }

  /** Salta a un instante concreto. Nunca retrocede. */
  set(t: Instant): void {
    if (t < this.#current) {
      throw new Error(`El reloj no puede retroceder: ${String(this.#current)} → ${String(t)}`);
    }
    this.#current = t;
  }

  advance(m: Minutes): void {
    this.#current = addMinutes(this.#current, m);
  }
}
