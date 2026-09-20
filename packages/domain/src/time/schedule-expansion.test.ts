import {
  addDays,
  instantFromISO,
  minutes,
  scheduleId,
  toISO,
  aircraftId,
  routeId,
} from '@airline/shared';
import { describe, expect, it } from 'vitest';
import { daysOfWeekMask, weeklyFrequency, type FlightSchedule } from '../entities/schedule.js';
import { expandSchedule } from './schedule-expansion.js';

const VALID_FROM = instantFromISO('2026-07-01T00:00:00.000Z');

const SCHEDULE: FlightSchedule = {
  id: scheduleId('55555555-5555-4555-8555-555555555555'),
  routeId: routeId('44444444-4444-4444-8444-444444444444'),
  aircraftId: aircraftId('33333333-3333-4333-8333-333333333333'),
  daysOfWeek: daysOfWeekMask([1, 3, 5]), // lunes, miércoles y viernes
  departureMinuteUtc: minutes(18 * 60 + 20),
  flightNumber: 'TST204',
  validFrom: VALID_FROM,
  validTo: null,
  isActive: true,
};

describe('expansión de plantillas de programación', () => {
  it('genera las salidas de los días cubiertos', () => {
    const departures = expandSchedule(
      SCHEDULE,
      instantFromISO('2026-07-13T00:00:00.000Z'),
      instantFromISO('2026-07-20T00:00:00.000Z'),
    );
    expect(departures.map(toISO)).toEqual([
      '2026-07-13T18:20:00.000Z', // lunes
      '2026-07-15T18:20:00.000Z', // miércoles
      '2026-07-17T18:20:00.000Z', // viernes
    ]);
  });

  it('cuenta las frecuencias semanales de la plantilla', () => {
    expect(weeklyFrequency(SCHEDULE)).toBe(3);
    expect(
      weeklyFrequency({ ...SCHEDULE, daysOfWeek: daysOfWeekMask([0, 1, 2, 3, 4, 5, 6]) }),
    ).toBe(7);
  });

  it('no genera nada antes de la entrada en vigor', () => {
    const departures = expandSchedule(
      { ...SCHEDULE, validFrom: instantFromISO('2026-07-16T00:00:00.000Z') },
      instantFromISO('2026-07-13T00:00:00.000Z'),
      instantFromISO('2026-07-20T00:00:00.000Z'),
    );
    expect(departures.map(toISO)).toEqual(['2026-07-17T18:20:00.000Z']);
  });

  it('respeta el fin de vigencia', () => {
    const departures = expandSchedule(
      { ...SCHEDULE, validTo: instantFromISO('2026-07-15T23:59:00.000Z') },
      instantFromISO('2026-07-13T00:00:00.000Z'),
      instantFromISO('2026-07-20T00:00:00.000Z'),
    );
    expect(departures).toHaveLength(2);
  });

  it('una plantilla inactiva no genera vuelos', () => {
    expect(
      expandSchedule({ ...SCHEDULE, isActive: false }, VALID_FROM, addDays(VALID_FROM, 30)),
    ).toEqual([]);
  });

  it('respeta los límites de la ventana, abierta por la derecha', () => {
    const exact = expandSchedule(
      SCHEDULE,
      instantFromISO('2026-07-13T18:20:00.000Z'),
      instantFromISO('2026-07-15T18:20:00.000Z'),
    );
    expect(exact.map(toISO)).toEqual(['2026-07-13T18:20:00.000Z']);
  });

  it('es estable: la misma ventana da siempre lo mismo', () => {
    const window = [VALID_FROM, addDays(VALID_FROM, 21)] as const;
    expect(expandSchedule(SCHEDULE, window[0], window[1])).toEqual(
      expandSchedule(SCHEDULE, window[0], window[1]),
    );
  });
});
