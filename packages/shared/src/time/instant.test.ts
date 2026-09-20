import { describe, expect, it } from 'vitest';
import { ManualClock } from './manual-clock.js';
import {
  addDays,
  addMinutes,
  diffMinutes,
  instant,
  instantFromISO,
  minutes,
  startOfUtcDay,
  toISO,
  utcDateKey,
  utcDayOfWeek,
  utcMinuteOfDay,
  utcMonth,
  utcMonthKey,
} from './instant.js';

const T = instantFromISO('2026-07-15T18:20:00.000Z');

describe('Instant', () => {
  it('convierte ida y vuelta a ISO sin pérdida', () => {
    expect(toISO(T)).toBe('2026-07-15T18:20:00.000Z');
  });

  it('suma minutos y días', () => {
    expect(toISO(addMinutes(T, minutes(145)))).toBe('2026-07-15T20:45:00.000Z');
    expect(toISO(addDays(T, 3))).toBe('2026-07-18T18:20:00.000Z');
  });

  it('calcula diferencias en minutos', () => {
    expect(diffMinutes(T, addMinutes(T, minutes(88)))).toBe(88);
    expect(diffMinutes(addMinutes(T, minutes(30)), T)).toBe(-30);
  });

  it('deriva claves de calendario en UTC', () => {
    expect(utcDateKey(T)).toBe('2026-07-15');
    expect(utcMonthKey(T)).toBe('2026-07');
    expect(utcMonth(T)).toBe(7);
    expect(utcDayOfWeek(T)).toBe(3); // miércoles
    expect(utcMinuteOfDay(T)).toBe(18 * 60 + 20);
    expect(toISO(startOfUtcDay(T))).toBe('2026-07-15T00:00:00.000Z');
  });

  it('rechaza fechas inválidas', () => {
    expect(() => instantFromISO('no es una fecha')).toThrow();
    expect(() => instant(Number.NaN)).toThrow();
  });
});

describe('ManualClock', () => {
  it('avanza cuando se le pide y nunca retrocede', () => {
    const clock = new ManualClock(T);
    expect(clock.now()).toBe(T);
    clock.advance(minutes(60));
    expect(toISO(clock.now())).toBe('2026-07-15T19:20:00.000Z');
    expect(() => {
      clock.set(T);
    }).toThrow(/no puede retroceder/);
  });
});

describe('aritmética con días fraccionarios', () => {
  it('admite fracciones de día sin romper el instante', () => {
    // Medio día, un cuarto, y una fracción cualquiera: todas deben producir
    // milisegundos enteros.
    expect(toISO(addDays(T, 0.5))).toBe('2026-07-16T06:20:00.000Z');
    expect(toISO(addDays(T, 0.25))).toBe('2026-07-16T00:20:00.000Z');
    expect(() => addDays(T, 0.840552)).not.toThrow();
    expect(Number.isSafeInteger(addDays(T, 0.840552))).toBe(true);
  });

  it('admite retroceder en el tiempo', () => {
    expect(toISO(addDays(T, -1.5))).toBe('2026-07-14T06:20:00.000Z');
  });
});
