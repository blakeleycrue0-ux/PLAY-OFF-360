import type { Clock } from './clock.js';
import { instant, type Instant } from './instant.js';

/** Reloj de pared. Lo usan la API y el worker de producción. */
export class SystemClock implements Clock {
  now(): Instant {
    return instant(Date.now());
  }
}

export const systemClock = new SystemClock();
