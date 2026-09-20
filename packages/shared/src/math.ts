import { InvariantError } from './errors.js';

export function clamp(value: number, min: number, max: number): number {
  if (min > max) throw new InvariantError(`clamp con rango invertido: [${min}, ${max}]`);
  return value < min ? min : value > max ? max : value;
}

/** Interpolación lineal. `t` fuera de [0,1] extrapola: se acota antes si hace falta. */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Suma de un vector de números, en orden fijo para que sea reproducible. */
export function sum(values: readonly number[]): number {
  let total = 0;
  for (const v of values) total += v;
  return total;
}

export function round(value: number, decimals = 0): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/** Media aritmética; devuelve `fallback` si no hay valores. */
export function mean(values: readonly number[], fallback = 0): number {
  return values.length === 0 ? fallback : sum(values) / values.length;
}
