import type { Brand } from './brand.js';
import { InvariantError } from './errors.js';

/**
 * Dinero como número entero de céntimos (ADR-006).
 *
 * No existe dinero en coma flotante en ningún punto del sistema: `0.1 + 0.2`
 * no debe poder ocurrir sobre un saldo. Todas las operaciones son explícitas y
 * el redondeo está definido y es simétrico, para que un ingreso y un gasto del
 * mismo importe se redondeen igual.
 */
export type Money = Brand<number, 'Money'>;

export const ZERO_MONEY = 0 as Money;

/** Redondeo a entero, mitad alejándose del cero: −0,5 → −1 y 0,5 → 1. */
function roundHalfAwayFromZero(value: number): number {
  return value < 0 ? -Math.round(-value) : Math.round(value);
}

function assertSafe(cents: number): void {
  if (!Number.isFinite(cents) || !Number.isSafeInteger(cents)) {
    throw new InvariantError(`Importe fuera del rango entero seguro: ${cents}`);
  }
}

/** Construye un importe a partir de céntimos enteros. */
export function money(cents: number): Money {
  assertSafe(cents);
  return cents as Money;
}

/**
 * Construye un importe a partir de euros.
 *
 * Cuidado: el argumento ya es un doble, así que el redondeo se aplica al valor
 * binario real y no a su notación decimal (`1.005` es en realidad
 * `1.00499…`, y da 100 céntimos). Es correcto, pero significa que esta función
 * es una conveniencia de frontera: el constructor canónico del sistema es
 * `money(céntimos)`, y el dinero debe entrar ya en céntimos siempre que se
 * pueda.
 */
export function moneyFromEuros(euros: number): Money {
  return money(roundHalfAwayFromZero(euros * 100));
}

export function toEuros(m: Money): number {
  return m / 100;
}

export function addMoney(a: Money, b: Money): Money {
  return money(a + b);
}

export function subMoney(a: Money, b: Money): Money {
  return money(a - b);
}

export function negateMoney(m: Money): Money {
  return money(-m);
}

/** Multiplica por un factor adimensional (un porcentaje, una cantidad de unidades). */
export function mulMoney(m: Money, factor: number): Money {
  if (!Number.isFinite(factor)) {
    throw new InvariantError(`Factor no finito en mulMoney: ${factor}`);
  }
  return money(roundHalfAwayFromZero(m * factor));
}

export function sumMoney(values: readonly Money[]): Money {
  let total = 0;
  for (const v of values) total += v;
  return money(total);
}

export function compareMoney(a: Money, b: Money): -1 | 0 | 1 {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function isNegative(m: Money): boolean {
  return m < 0;
}

/** Formato de presentación. Nunca se usa para calcular. */
export function formatMoney(m: Money, currency = 'EUR', locale = 'es-ES'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(toEuros(m));
}
