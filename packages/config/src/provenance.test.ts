import { describe, expect, it } from 'vitest';
import { DEFAULT_BALANCE } from './default-balance.js';
import { leafPaths } from './paths.js';
import { PARAMETER_PROVENANCE, summarizeProvenance } from './provenance.js';
import { validateBalance } from './schema.js';

describe('parámetros de balance', () => {
  it('los parámetros por defecto son válidos', () => {
    expect(() => validateBalance(DEFAULT_BALANCE)).not.toThrow();
  });

  it('rechaza una elasticidad de precio positiva', () => {
    const broken = {
      ...DEFAULT_BALANCE,
      logit: {
        ...DEFAULT_BALANCE.logit,
        leisure: { ...DEFAULT_BALANCE.logit.leisure, price: 1.2 },
      },
    };
    expect(() => validateBalance(broken)).toThrow(/logit.leisure.price/);
  });

  it('rechaza cuotas de segmento que no suman 1', () => {
    const broken = {
      ...DEFAULT_BALANCE,
      demand: {
        ...DEFAULT_BALANCE.demand,
        segmentShare: { business: 0.5, leisure: 0.5, vfr: 0.5 },
      },
    };
    expect(() => validateBalance(broken)).toThrow(/segmentShare/);
  });
});

describe('procedencia de los parámetros', () => {
  const paths = leafPaths(DEFAULT_BALANCE);

  it('encuentra todas las hojas de la configuración', () => {
    expect(paths.length).toBeGreaterThan(70);
    expect(paths).toContain('fleet.checks.C.intervalHours');
    expect(paths).toContain('logit.business.price');
  });

  // Ésta es la garantía estructural de que no se cuela una constante
  // económica inventada: añadir un parámetro obliga a declarar de dónde sale.
  it('todo parámetro declara su procedencia', () => {
    const undeclared = paths.filter((p) => !(p in PARAMETER_PROVENANCE));
    expect(undeclared, `Parámetros sin procedencia declarada:\n${undeclared.join('\n')}`).toEqual(
      [],
    );
  });

  it('no hay procedencias declaradas para parámetros que ya no existen', () => {
    const known = new Set(paths);
    const orphans = Object.keys(PARAMETER_PROVENANCE).filter((p) => !known.has(p));
    expect(orphans, `Procedencias huérfanas:\n${orphans.join('\n')}`).toEqual([]);
  });

  it('todo parámetro provisional explica qué falta', () => {
    const { provisional } = summarizeProvenance();
    for (const entry of provisional) {
      expect(entry.note.length, `${entry.path} no explica qué falta`).toBeGreaterThan(20);
    }
  });

  it('los coeficientes de elasticidad de precio vienen de los documentos', () => {
    for (const segment of ['business', 'leisure', 'vfr'] as const) {
      expect(PARAMETER_PROVENANCE[`logit.${segment}.price`]?.status).toBe('docs');
    }
  });
});
