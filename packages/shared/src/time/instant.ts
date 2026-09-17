import type { Brand } from '../brand.js';
import { InvariantError } from '../errors.js';

/** Instante absoluto en milisegundos desde la época Unix, en UTC. */
export type Instant = Brand<number, 'Instant'>;

/** Duración en milisegundos. Las unidades del dominio se derivan de ésta. */
export type Millis = Brand<number, 'Millis'>;

export type Minutes = Brand<number, 'Minutes'>;
export type Hours = Brand<number, 'Hours'>;

export const MS_PER_MINUTE = 60_000;
export const MS_PER_HOUR = 3_600_000;
export const MS_PER_DAY = 86_400_000;

export function instant(epochMillis: number): Instant {
  if (!Number.isFinite(epochMillis) || !Number.isSafeInteger(epochMillis)) {
    throw new InvariantError(`Instante inválido: ${epochMillis}`);
  }
  return epochMillis as Instant;
}

export function instantFromISO(iso: string): Instant {
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) {
    throw new InvariantError(`Fecha ISO inválida: "${iso}"`);
  }
  return parsed as Instant;
}

export function toISO(t: Instant): string {
  return new Date(t).toISOString();
}

export function toDate(t: Instant): Date {
  return new Date(t);
}

export const minutes = (n: number): Minutes => n as Minutes;
export const hours = (n: number): Hours => n as Hours;

export function minutesToMillis(m: Minutes): Millis {
  return Math.round(m * MS_PER_MINUTE) as Millis;
}

export function millisToMinutes(ms: Millis): Minutes {
  return (ms / MS_PER_MINUTE) as Minutes;
}

export function minutesToHours(m: Minutes): Hours {
  return (m / 60) as Hours;
}

export function addMillis(t: Instant, ms: number): Instant {
  return instant(t + Math.round(ms));
}

export function addMinutes(t: Instant, m: Minutes): Instant {
  return instant(t + Math.round(m * MS_PER_MINUTE));
}

export function addDays(t: Instant, days: number): Instant {
  return instant(t + days * MS_PER_DAY);
}

export function diffMinutes(from: Instant, to: Instant): Minutes {
  return ((to - from) / MS_PER_MINUTE) as Minutes;
}

export function isBefore(a: Instant, b: Instant): boolean {
  return a < b;
}

export function maxInstant(a: Instant, b: Instant): Instant {
  return a >= b ? a : b;
}

export function minInstant(a: Instant, b: Instant): Instant {
  return a <= b ? a : b;
}

/** Comienzo del día UTC que contiene `t`. */
export function startOfUtcDay(t: Instant): Instant {
  return instant(Math.floor(t / MS_PER_DAY) * MS_PER_DAY);
}

/** Día UTC como `YYYY-MM-DD`; es la clave natural de los cierres diarios. */
export function utcDateKey(t: Instant): string {
  return new Date(t).toISOString().slice(0, 10);
}

/** Mes UTC como `YYYY-MM`; clave de las particiones y de los cierres mensuales. */
export function utcMonthKey(t: Instant): string {
  return new Date(t).toISOString().slice(0, 7);
}

/** Día de la semana en UTC: 0 = domingo … 6 = sábado. */
export function utcDayOfWeek(t: Instant): number {
  return new Date(t).getUTCDay();
}

/** Mes UTC: 1 = enero … 12 = diciembre. */
export function utcMonth(t: Instant): number {
  return new Date(t).getUTCMonth() + 1;
}

/** Minutos transcurridos desde medianoche UTC. */
export function utcMinuteOfDay(t: Instant): Minutes {
  return ((t - startOfUtcDay(t)) / MS_PER_MINUTE) as Minutes;
}
