import { instant, type Instant } from '@airline/shared';

/** Instante del dominio → parámetro de PostgreSQL. */
export function toDbTimestamp(value: Instant): string {
  return new Date(value).toISOString();
}

export function toDbTimestampOrNull(value: Instant | null): string | null {
  return value === null ? null : toDbTimestamp(value);
}

/** `timestamptz` de PostgreSQL → instante del dominio. */
export function fromDbTimestamp(value: Date): Instant {
  return instant(value.getTime());
}

export function fromDbTimestampOrNull(value: Date | null): Instant | null {
  return value === null ? null : fromDbTimestamp(value);
}
