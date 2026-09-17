import { describe, expect, it } from 'vitest';
import { bernoulli, createRng, nextGaussian, nextInt, seedFrom, weightedPick } from './seeded-rng.js';

describe('RNG determinista', () => {
  it('la misma semilla produce exactamente la misma secuencia', () => {
    const a = createRng('world-1', 'flight-42', 'incident');
    const b = createRng('world-1', 'flight-42', 'incident');
    const seqA = Array.from({ length: 50 }, () => a());
    const seqB = Array.from({ length: 50 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it('semillas distintas producen secuencias distintas', () => {
    const a = createRng('world-1', 'flight-42');
    const b = createRng('world-1', 'flight-43');
    expect(a()).not.toBe(b());
  });

  it('produce valores en [0, 1)', () => {
    const rng = createRng('rango');
    for (let i = 0; i < 5_000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('nextInt respeta los extremos incluidos', () => {
    const rng = createRng('enteros');
    const seen = new Set<number>();
    for (let i = 0; i < 2_000; i++) seen.add(nextInt(rng, 1, 6));
    expect([...seen].sort((x, y) => x - y)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('weightedPick respeta los pesos dentro de un margen razonable', () => {
    const rng = createRng('pesos');
    let heavy = 0;
    const n = 20_000;
    for (let i = 0; i < n; i++) {
      if (weightedPick(rng, [['heavy', 9] as const, ['light', 1] as const]) === 'heavy') heavy += 1;
    }
    expect(heavy / n).toBeGreaterThan(0.87);
    expect(heavy / n).toBeLessThan(0.93);
  });

  it('bernoulli reproduce la probabilidad pedida', () => {
    const rng = createRng('bernoulli');
    let hits = 0;
    for (let i = 0; i < 20_000; i++) if (bernoulli(rng, 0.25)) hits += 1;
    expect(hits / 20_000).toBeGreaterThan(0.23);
    expect(hits / 20_000).toBeLessThan(0.27);
  });

  it('nextGaussian tiene media cercana a cero y sigma cercana a uno', () => {
    const rng = createRng('gauss');
    const samples = Array.from({ length: 20_000 }, () => nextGaussian(rng));
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    const variance = samples.reduce((a, b) => a + (b - mean) ** 2, 0) / samples.length;
    expect(Math.abs(mean)).toBeLessThan(0.05);
    expect(Math.abs(Math.sqrt(variance) - 1)).toBeLessThan(0.05);
  });

  it('seedFrom es estable entre ejecuciones', () => {
    expect(seedFrom('world-1', 42, 'departure')).toBe(seedFrom('world-1', 42, 'departure'));
  });
});
