import { describe, expect, it } from 'vitest';
import { toUtcMinute } from './world-builder.js';

/**
 * El horario de una aerolínea se construye en hora local de su base y se
 * publica en UTC. Cuando esto se medía directamente en UTC, las sesenta
 * compañías del mundo abrían el día a la misma hora absoluta y la operación
 * cabía en una franja artificialmente estrecha: nadie despegaba antes de las
 * 06:00 UTC ni aterrizaba después de las 21:09 UTC.
 */
describe('hora local de la base → hora UTC', () => {
  const SIX_AM = 6 * 60;

  it('una base en UTC no mueve nada', () => {
    expect(toUtcMinute(SIX_AM, 0)).toBe(SIX_AM);
  });

  it('una base al este abre el día antes en UTC', () => {
    // Estambul (UTC+3) a las 06:00 locales son las 03:00 UTC.
    expect(toUtcMinute(SIX_AM, 180)).toBe(3 * 60);
  });

  it('una base al oeste abre el día después en UTC', () => {
    // Azores (UTC−1) a las 06:00 locales son las 07:00 UTC.
    expect(toUtcMinute(SIX_AM, -60)).toBe(7 * 60);
  });

  it('el conjunto de husos europeos ensancha el día a trece horas de diferencia', () => {
    const earliest = toUtcMinute(SIX_AM, 180);
    const latest = toUtcMinute(22 * 60, -60);
    expect(earliest).toBe(3 * 60);
    expect(latest).toBe(23 * 60);
  });

  it('normaliza al día aunque un huso nuevo se salga por abajo', () => {
    expect(toUtcMinute(60, 180)).toBe(22 * 60);
  });

  it('normaliza al día aunque un huso nuevo se salga por arriba', () => {
    expect(toUtcMinute(23 * 60, -120)).toBe(60);
  });
});
