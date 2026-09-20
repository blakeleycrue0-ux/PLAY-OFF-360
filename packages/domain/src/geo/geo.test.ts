import { instantFromISO } from '@airline/shared';
import { describe, expect, it } from 'vitest';
import { LGW, PMI, SMALL_FIELD } from '../testing/fixtures.js';
import { greatCircleDistanceKm, initialBearing } from './distance.js';
import { calculateFlightPosition, interpolateGreatCircle, phaseFor } from './position.js';

const DEP = instantFromISO('2026-07-15T18:20:00.000Z');
const ARR = instantFromISO('2026-07-15T20:33:00.000Z');

describe('distancia entre aeropuertos', () => {
  it('reproduce la distancia real PMI-LGW', () => {
    // Ortodrómica real entre Palma y Gatwick: 1.309 km. (docs/02 §2.5 la cita
    // redondeada como "1.317 km" en un ejemplo ilustrativo; el valor calculado
    // es el que manda.)
    const distance = greatCircleDistanceKm(PMI, LGW);
    expect(distance).toBeGreaterThan(1_305);
    expect(distance).toBeLessThan(1_313);
  });

  it('es simétrica', () => {
    expect(greatCircleDistanceKm(PMI, LGW)).toBeCloseTo(greatCircleDistanceKm(LGW, PMI), 9);
  });

  it('es cero sobre el mismo punto', () => {
    expect(greatCircleDistanceKm(PMI, PMI)).toBe(0);
  });

  it('calcula el rumbo inicial nornoroeste en PMI-LGW', () => {
    // Gatwick queda casi al norte de Palma, ligeramente al oeste: ~351°.
    const bearing = initialBearing(PMI, LGW);
    expect(bearing).toBeGreaterThan(345);
    expect(bearing).toBeLessThan(356);
  });
});

describe('posición interpolada', () => {
  it('coincide con el origen y el destino en los extremos', () => {
    const start = interpolateGreatCircle(PMI, LGW, 0);
    const end = interpolateGreatCircle(PMI, LGW, 1);
    expect(start.latitude).toBeCloseTo(PMI.latitude, 6);
    expect(start.longitude).toBeCloseTo(PMI.longitude, 6);
    expect(end.latitude).toBeCloseTo(LGW.latitude, 6);
    expect(end.longitude).toBeCloseTo(LGW.longitude, 6);
  });

  it('el punto medio está sobre el arco, no sobre la media aritmética', () => {
    const mid = interpolateGreatCircle(PMI, LGW, 0.5);
    const linearLat = (PMI.latitude + LGW.latitude) / 2;

    // A la mitad del arco, cada tramo mide la mitad del total.
    const total = greatCircleDistanceKm(PMI, LGW);
    expect(greatCircleDistanceKm(PMI, mid)).toBeCloseTo(total / 2, 1);
    expect(greatCircleDistanceKm(mid, LGW)).toBeCloseTo(total / 2, 1);

    // Y queda al norte de la interpolación lineal: ésa es la diferencia
    // que justifica interpolar sobre la esfera.
    expect(mid.latitude).toBeGreaterThan(linearLat);
  });

  it('avanza de forma monótona con el tiempo', () => {
    let previous = -1;
    for (let i = 0; i <= 10; i++) {
      const at = instantFromISO('2026-07-15T18:20:00.000Z') + ((ARR - DEP) * i) / 10;
      const position = calculateFlightPosition(PMI, LGW, DEP, ARR, at as typeof DEP);
      expect(position.progress).toBeGreaterThanOrEqual(previous);
      previous = position.progress;
    }
    expect(previous).toBe(1);
  });

  it('no se sale del trayecto aunque se pregunte fuera de la ventana', () => {
    const before = calculateFlightPosition(
      PMI,
      LGW,
      DEP,
      ARR,
      instantFromISO('2026-07-15T10:00:00.000Z'),
    );
    const after = calculateFlightPosition(
      PMI,
      LGW,
      DEP,
      ARR,
      instantFromISO('2026-07-16T10:00:00.000Z'),
    );
    expect(before.progress).toBe(0);
    expect(after.progress).toBe(1);
    expect(after.phase).toBe('arrived');
  });

  it('describe las fases del vuelo', () => {
    expect(phaseFor(0)).toBe('scheduled');
    expect(phaseFor(0.04)).toBe('climb');
    expect(phaseFor(0.5)).toBe('cruise');
    expect(phaseFor(0.95)).toBe('descent');
    expect(phaseFor(1)).toBe('arrived');
  });

  it('sube, cruza y desciende', () => {
    const climb = calculateFlightPosition(
      PMI,
      LGW,
      DEP,
      ARR,
      instantFromISO('2026-07-15T18:24:00.000Z'),
    );
    const cruise = calculateFlightPosition(
      PMI,
      LGW,
      DEP,
      ARR,
      instantFromISO('2026-07-15T19:25:00.000Z'),
    );
    const descent = calculateFlightPosition(
      PMI,
      LGW,
      DEP,
      ARR,
      instantFromISO('2026-07-15T20:28:00.000Z'),
    );

    expect(climb.altitudeMeters).toBeLessThan(cruise.altitudeMeters);
    expect(descent.altitudeMeters).toBeLessThan(cruise.altitudeMeters);
    expect(cruise.altitudeMeters).toBeGreaterThan(9_000);
  });

  it('dos observadores obtienen exactamente la misma posición', () => {
    // Es la propiedad que permite que el servidor no difunda posiciones:
    // todos calculan la misma función sobre los mismos datos (docs/03 §3.2).
    const at = instantFromISO('2026-07-15T19:10:00.000Z');
    const a = calculateFlightPosition(PMI, LGW, DEP, ARR, at);
    const b = calculateFlightPosition(PMI, LGW, DEP, ARR, at);
    expect(a).toEqual(b);
  });

  it('funciona sobre trayectos muy cortos sin dividir por cero', () => {
    const position = calculateFlightPosition(PMI, SMALL_FIELD, DEP, ARR, DEP);
    expect(Number.isFinite(position.latitude)).toBe(true);
    expect(Number.isFinite(position.longitude)).toBe(true);
  });
});
