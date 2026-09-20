import type { Instant } from './instant.js';

/**
 * Fuente de tiempo inyectable (ADR-010).
 *
 * Nada en el sistema llama a `Date.now()` directamente: lint lo impide. El
 * worker de producción recibe un `SystemClock` y el arnés de simulación un
 * reloj virtual que salta al siguiente trabajo pendiente. Gracias a eso, el
 * mismo motor sirve para producción y para simular doce meses en segundos.
 */
export interface Clock {
  now(): Instant;
}
