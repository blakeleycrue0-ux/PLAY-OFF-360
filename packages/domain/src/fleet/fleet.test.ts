import { DEFAULT_BALANCE } from '@airline/config';
import { toEuros } from '@airline/shared';
import { describe, expect, it } from 'vitest';
import { NB160, REG70, TEST_AIRCRAFT } from '../testing/fixtures.js';
import { applyCheck, checkCost, deferCheck, isCheckDue, nextCheckFor } from './maintenance.js';
import { effectiveReliability } from './reliability.js';
import { applyFlightWear } from './wear.js';

const CFG = DEFAULT_BALANCE;

describe('desgaste', () => {
  it('acumula horas y ciclos en cada vuelo', () => {
    const wear = applyFlightWear(TEST_AIRCRAFT, 132, CFG);
    expect(wear.flightHours).toBeCloseTo(TEST_AIRCRAFT.flightHours + 2.2, 2);
    expect(wear.cycles).toBe(TEST_AIRCRAFT.cycles + 1);
    expect(wear.condition).toBeLessThan(TEST_AIRCRAFT.condition);
  });

  it('los vuelos cortos desgastan más por hora que los largos', () => {
    // Un ciclo castiga el doble que una hora: cuatro saltos de 1 h gastan más
    // que un vuelo de 4 h. Es lo que hace cara la operación regional.
    let shortHaul = TEST_AIRCRAFT;
    for (let i = 0; i < 4; i++)
      shortHaul = { ...shortHaul, ...applyFlightWear(shortHaul, 60, CFG) };
    const longHaul = applyFlightWear(TEST_AIRCRAFT, 240, CFG);

    expect(shortHaul.flightHours).toBeCloseTo(longHaul.flightHours, 6);
    expect(shortHaul.condition).toBeLessThan(longHaul.condition);
  });

  it('la condición nunca baja de cero', () => {
    const wrecked = { ...TEST_AIRCRAFT, condition: 0.01 };
    expect(applyFlightWear(wrecked, 600, CFG).condition).toBe(0);
  });
});

describe('mantenimiento', () => {
  it('el próximo check es el umbral más cercano por delante', () => {
    expect(nextCheckFor(0, CFG)).toEqual({ type: 'A', atHours: 600 });
    expect(nextCheckFor(700, CFG)).toEqual({ type: 'A', atHours: 1_200 });
    expect(nextCheckFor(2_900, CFG)).toEqual({ type: 'B', atHours: 3_000 });
  });

  it('cuando coinciden varios grados manda el mayor', () => {
    // A las 24.000 h vencen A, B, C y D a la vez: el D absorbe a los demás.
    expect(nextCheckFor(23_999, CFG)).toEqual({ type: 'D', atHours: 24_000 });
    expect(nextCheckFor(11_999, CFG)).toEqual({ type: 'C', atHours: 12_000 });
  });

  it('el coste escala con el tamaño del avión', () => {
    expect(checkCost(NB160, 'C', CFG)).toBeGreaterThan(checkCost(REG70, 'C', CFG));
    // Un check C de narrowbody ronda los 380.000 € de docs/03 §3.7.
    expect(toEuros(checkCost(NB160, 'C', CFG))).toBeGreaterThan(300_000);
    expect(toEuros(checkCost(NB160, 'C', CFG))).toBeLessThan(420_000);
  });

  it('un check recupera condición y limpia los aplazamientos', () => {
    const worn = { ...TEST_AIRCRAFT, condition: 40, deferredChecks: 2, flightHours: 3_000 };
    const outcome = applyCheck(worn, 'B', CFG);
    expect(outcome.condition).toBe(60);
    expect(outcome.deferredChecks).toBe(0);
    expect(outcome.nextCheckAtHours).toBeGreaterThan(worn.flightHours);
  });

  it('el check D restaura el avión casi a nuevo', () => {
    const outcome = applyCheck({ ...TEST_AIRCRAFT, condition: 12 }, 'D', CFG);
    expect(outcome.condition).toBe(95);
  });

  it('detecta un check vencido', () => {
    expect(isCheckDue({ ...TEST_AIRCRAFT, flightHours: 1_799, nextCheckAtHours: 1_800 })).toBe(
      false,
    );
    expect(isCheckDue({ ...TEST_AIRCRAFT, flightHours: 1_800, nextCheckAtHours: 1_800 })).toBe(
      true,
    );
  });

  it('aplazar da margen pero deja rastro', () => {
    const due = { ...TEST_AIRCRAFT, flightHours: 1_800, nextCheckAtHours: 1_800 };
    const outcome = deferCheck(due, CFG);
    expect(outcome.deferredChecks).toBe(1);
    expect(outcome.nextCheckAtHours).toBe(1_800 + 600 * CFG.fleet.deferGraceFactor);
    expect(outcome.condition).toBe(due.condition); // aplazar no repara nada
  });

  it('el desgaste no reprograma un check ya vencido', () => {
    // Si el jugador vuela con el check vencido, el umbral sigue donde estaba:
    // aplazar es una decisión suya, no un efecto automático.
    const due = { ...TEST_AIRCRAFT, flightHours: 1_850, nextCheckAtHours: 1_800 };
    const wear = applyFlightWear(due, 120, CFG);
    expect(wear.nextCheckAtHours).toBe(1_800);
    expect(wear.nextCheckType).toBe(due.nextCheckType);
  });
});

describe('fiabilidad efectiva', () => {
  const YEAR = 2026;

  it('un avión nuevo y cuidado se acerca a la fiabilidad de diseño', () => {
    const value = effectiveReliability(TEST_AIRCRAFT, NB160, YEAR, CFG);
    expect(value).toBeGreaterThan(0.95);
    expect(value).toBeLessThanOrEqual(NB160.baseReliability);
  });

  it('la condición baja la fiabilidad', () => {
    const healthy = effectiveReliability(TEST_AIRCRAFT, NB160, YEAR, CFG);
    const worn = effectiveReliability({ ...TEST_AIRCRAFT, condition: 30 }, NB160, YEAR, CFG);
    expect(worn).toBeLessThan(healthy);
  });

  it('diferir mantenimiento penaliza fuerte', () => {
    const compliant = effectiveReliability(TEST_AIRCRAFT, NB160, YEAR, CFG);
    const deferred = effectiveReliability(
      { ...TEST_AIRCRAFT, deferredChecks: 3 },
      NB160,
      YEAR,
      CFG,
    );
    expect(deferred).toBeLessThan(compliant * 0.85);
  });

  it('la edad sólo empieza a pesar pasado el umbral', () => {
    const young = effectiveReliability({ ...TEST_AIRCRAFT, builtYear: 2016 }, NB160, YEAR, CFG);
    const fresh = effectiveReliability({ ...TEST_AIRCRAFT, builtYear: 2024 }, NB160, YEAR, CFG);
    const old = effectiveReliability({ ...TEST_AIRCRAFT, builtYear: 1996 }, NB160, YEAR, CFG);

    expect(young).toBe(fresh); // 10 años: por debajo del umbral de 15
    expect(old).toBeLessThan(fresh);
  });

  it('nunca sale del rango 0..1', () => {
    const disaster = { ...TEST_AIRCRAFT, condition: 0, deferredChecks: 99, builtYear: 1960 };
    const value = effectiveReliability(disaster, NB160, YEAR, CFG);
    expect(value).toBeGreaterThan(0);
    expect(value).toBeLessThan(1);
  });
});
