import { DEFAULT_BALANCE } from '@airline/config';
import { addMinutes, createRng, instantFromISO, minutes } from '@airline/shared';
import { describe, expect, it } from 'vitest';
import { LGW, NB160, PMI, REG70, SMALL_FIELD, TEST_AIRCRAFT } from '../testing/fixtures.js';
import { calculateDepartureDelay, isOnTime } from './delay.js';
import { validateFlightPlan } from './validation.js';

const CFG = DEFAULT_BALANCE;
const DEPARTURE = instantFromISO('2026-07-15T18:20:00.000Z');

function validate(overrides: Partial<Parameters<typeof validateFlightPlan>[0]> = {}) {
  return validateFlightPlan(
    {
      aircraft: TEST_AIRCRAFT,
      type: NB160,
      origin: PMI,
      destination: LGW,
      distanceKm: 1_309,
      departure: DEPARTURE,
      cabin: { economy: 170, business: 8 },
      ...overrides,
    },
    CFG,
  );
}

describe('validación de un vuelo', () => {
  it('acepta un plan correcto', () => {
    expect(validate().ok).toBe(true);
  });

  it('rechaza un avión que no llega a tiempo, y lo explica', () => {
    const late = { ...TEST_AIRCRAFT, availableAt: addMinutes(DEPARTURE, minutes(30)) };
    const result = validate({ aircraft: late });
    expect(result.ok).toBe(false);
    if (result.ok) return;

    const violation = result.error.find((v) => v.code === 'aircraft_unavailable');
    expect(violation).toBeDefined();
    expect(violation?.message).toContain('turnaround');
    expect(violation?.details['registration']).toBe('EC-TST');
  });

  it('rechaza una ruta fuera de alcance contando el rodeo', () => {
    const result = validate({ type: REG70, distanceKm: 2_350 });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.some((v) => v.code === 'insufficient_range')).toBe(true);
  });

  it('rechaza una pista demasiado corta en cualquiera de los dos extremos', () => {
    const fromSmall = validate({ origin: SMALL_FIELD });
    const toSmall = validate({ destination: SMALL_FIELD });
    expect(fromSmall.ok).toBe(false);
    expect(toSmall.ok).toBe(false);
    if (!fromSmall.ok)
      expect(fromSmall.error.some((v) => v.code === 'runway_too_short_origin')).toBe(true);
    if (!toSmall.ok)
      expect(toSmall.error.some((v) => v.code === 'runway_too_short_destination')).toBe(true);
  });

  it('rechaza una cabina que no cabe', () => {
    const result = validate({ cabin: { economy: 180, business: 20 } });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.some((v) => v.code === 'cabin_over_capacity')).toBe(true);
  });

  it('acepta una cabina densa que sí cabe', () => {
    expect(validate({ cabin: { economy: 186, business: 0 } }).ok).toBe(true);
  });

  it('rechaza un avión en mantenimiento', () => {
    const result = validate({ aircraft: { ...TEST_AIRCRAFT, status: 'maintenance' } });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.some((v) => v.code === 'aircraft_not_operational')).toBe(true);
  });

  it('devuelve todas las reglas incumplidas de una vez, no la primera', () => {
    const result = validate({
      type: REG70,
      origin: SMALL_FIELD,
      distanceKm: 4_000,
      aircraft: {
        ...TEST_AIRCRAFT,
        status: 'aog',
        availableAt: addMinutes(DEPARTURE, minutes(90)),
      },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.length).toBeGreaterThanOrEqual(4);
  });

  it('rechaza origen y destino iguales', () => {
    const result = validate({ destination: PMI, distanceKm: 0 });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.some((v) => v.code === 'same_airport')).toBe(true);
    expect(result.error.some((v) => v.code === 'invalid_distance')).toBe(true);
  });
});

describe('retraso de salida', () => {
  const rng = (): ReturnType<typeof createRng> => createRng('mundo', 'vuelo-1', 'delay');

  it('sin arrastre ni avería, el vuelo sale a su hora', () => {
    const perfect = { ...TEST_AIRCRAFT, condition: 100 };
    const delay = calculateDepartureDelay(
      { scheduledDeparture: DEPARTURE, aircraftAvailableAt: perfect.availableAt, reliability: 1 },
      CFG,
      rng(),
    );
    expect(delay.total).toBe(0);
  });

  it('LA PROPAGACIÓN: si el avión llegó tarde, el siguiente vuelo sale tarde', () => {
    // Es lo que convierte la programación en un problema interesante: apretar
    // las rotaciones maximiza la utilización y arrastra el retraso todo el día.
    const delay = calculateDepartureDelay(
      {
        scheduledDeparture: DEPARTURE,
        aircraftAvailableAt: addMinutes(DEPARTURE, minutes(40)),
        reliability: 1,
      },
      CFG,
      rng(),
    );
    expect(delay.rotation).toBe(40);
    expect(delay.total).toBe(40);
  });

  it('una flota poco fiable acumula retrasos técnicos', () => {
    const sample = (reliability: number): number => {
      let total = 0;
      for (let i = 0; i < 400; i++) {
        total += calculateDepartureDelay(
          { scheduledDeparture: DEPARTURE, aircraftAvailableAt: DEPARTURE, reliability },
          CFG,
          createRng('mundo', `vuelo-${i}`, 'delay'),
        ).technical;
      }
      return total;
    };

    expect(sample(0.7)).toBeGreaterThan(sample(0.99) * 3);
  });

  it('es determinista: el mismo vuelo da siempre el mismo retraso', () => {
    const compute = (): number =>
      calculateDepartureDelay(
        { scheduledDeparture: DEPARTURE, aircraftAvailableAt: DEPARTURE, reliability: 0.8 },
        CFG,
        createRng('mundo', 'vuelo-7', 'delay'),
      ).total;
    expect(compute()).toBe(compute());
  });

  it('aplica el umbral de puntualidad de 15 minutos', () => {
    expect(isOnTime(minutes(15), CFG)).toBe(true);
    expect(isOnTime(minutes(16), CFG)).toBe(false);
  });
});
