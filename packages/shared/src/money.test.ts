import { describe, expect, it } from 'vitest';
import {
  addMoney,
  compareMoney,
  formatMoney,
  money,
  moneyFromEuros,
  mulMoney,
  negateMoney,
  subMoney,
  sumMoney,
  toEuros,
  ZERO_MONEY,
} from './money.js';
import { InvariantError } from './errors.js';

describe('Money', () => {
  it('no arrastra error de coma flotante', () => {
    // El caso que motiva ADR-006: 0,1 + 0,2 en coma flotante da 0,30000000000000004.
    const total = addMoney(moneyFromEuros(0.1), moneyFromEuros(0.2));
    expect(total).toBe(30);
    expect(toEuros(total)).toBe(0.3);
  });

  it('suma mil importes sin desviarse ni un céntimo', () => {
    const entries = Array.from({ length: 1000 }, () => moneyFromEuros(0.07));
    expect(toEuros(sumMoney(entries))).toBe(70);
  });

  it('redondea alejándose del cero, de forma simétrica', () => {
    // 0,125 sí es exactamente representable, así que 12,5 céntimos es un
    // empate real y comprueba la simetría del redondeo.
    expect(moneyFromEuros(0.125)).toBe(13);
    expect(moneyFromEuros(-0.125)).toBe(-13);
    expect(mulMoney(money(101), 0.5)).toBe(51);
    expect(mulMoney(money(-101), 0.5)).toBe(-51);
    expect(mulMoney(money(25), 0.5)).toBe(13);
    expect(mulMoney(money(-25), 0.5)).toBe(-13);
  });

  it('redondea el valor binario real, no la notación decimal', () => {
    // 1,005 en doble precisión es 1,00499999…, así que 100 céntimos es el
    // resultado aritméticamente correcto. Queda documentado porque es la
    // razón por la que el constructor canónico es money(céntimos) y no
    // moneyFromEuros(): el dinero debe entrar al sistema ya en céntimos.
    expect(moneyFromEuros(1.005)).toBe(100);
  });

  it('opera con las primitivas esperadas', () => {
    expect(subMoney(money(500), money(200))).toBe(300);
    expect(negateMoney(money(500))).toBe(-500);
    expect(mulMoney(money(1000), 1.5)).toBe(1500);
    expect(sumMoney([])).toBe(ZERO_MONEY);
    expect(compareMoney(money(1), money(2))).toBe(-1);
    expect(compareMoney(money(2), money(2))).toBe(0);
    expect(compareMoney(money(3), money(2))).toBe(1);
  });

  it('rechaza importes no representables con exactitud', () => {
    expect(() => money(1.5)).toThrow(InvariantError);
    expect(() => money(Number.MAX_SAFE_INTEGER + 10)).toThrow(InvariantError);
    expect(() => mulMoney(money(100), Number.POSITIVE_INFINITY)).toThrow(InvariantError);
  });

  it('formatea para presentación sin perder el valor', () => {
    expect(formatMoney(moneyFromEuros(50_000_000))).toContain('50.000.000');
  });
});
