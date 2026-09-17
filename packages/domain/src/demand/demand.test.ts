import { DEFAULT_BALANCE } from '@airline/config';
import { airlineId, instantFromISO, minutes, money } from '@airline/shared';
import { describe, expect, it } from 'vitest';
import { BCN, LGW, PMI, SMALL_FIELD } from '../testing/fixtures.js';
import { calculateReferenceFare } from '../economics/fare.js';
import { allocateDemand, calculateUtility, timeOfDayScore } from './allocation.js';
import { calculateDemand } from './base-demand.js';
import { cabinQualityScore, type FlightOption, type MarketContext } from './market.js';

const CFG = DEFAULT_BALANCE;
const JULY = instantFromISO('2026-07-15T12:00:00.000Z');
const FEBRUARY = instantFromISO('2026-02-11T12:00:00.000Z');

const MARKET: MarketContext = {
  referenceFares: {
    economy: calculateReferenceFare(1_309, 'economy', CFG),
    business: calculateReferenceFare(1_309, 'business', CFG),
  },
};

function option(overrides: Partial<FlightOption> & { key: string }): FlightOption {
  return {
    airlineId: airlineId('22222222-2222-4222-8222-222222222222'),
    prices: { economy: MARKET.referenceFares.economy, business: MARKET.referenceFares.business },
    seats: { economy: 170, business: 8 },
    departureMinuteUtc: minutes(8 * 60),
    originUtcOffsetMinutes: 60,
    weeklyFrequency: 7,
    reputation: 50,
    onTimeRate: 85,
    productScore: 0.5,
    loyalty: 0,
    stops: 0,
    ...overrides,
  };
}

describe('demanda base (modelo de gravedad)', () => {
  it('un mercado más grande genera más demanda', () => {
    const big = calculateDemand(PMI, LGW, JULY, CFG).total;
    const small = calculateDemand(SMALL_FIELD, LGW, JULY, CFG).total;
    expect(big).toBeGreaterThan(small);
  });

  it('la demanda decae con la distancia por encima del umbral corto', () => {
    const veryFar = { ...LGW, latitude: 59.65, longitude: 17.92 }; // ~2.700 km
    const near = calculateDemand(PMI, LGW, JULY, CFG);
    const far = calculateDemand(PMI, veryFar, JULY, CFG);
    expect(near.distanceKm).toBeGreaterThan(CFG.demand.shortHaulThresholdKm);
    expect(far.distanceKm).toBeGreaterThan(near.distanceKm);
    expect(near.factors.distanceDecay).toBeGreaterThan(far.factors.distanceDecay);
  });

  it('penaliza las rutas tan cortas que no compiten con el transporte terrestre', () => {
    const veryShort = calculateDemand(PMI, SMALL_FIELD, JULY, CFG);
    expect(veryShort.distanceKm).toBeLessThan(CFG.demand.shortHaulThresholdKm);
    expect(veryShort.factors.distanceDecay).toBeLessThan(1);
  });

  it('Mallorca en julio es otro mercado que Mallorca en febrero', () => {
    const summer = calculateDemand(PMI, LGW, JULY, CFG).total;
    const winter = calculateDemand(PMI, LGW, FEBRUARY, CFG).total;
    expect(summer / winter).toBeGreaterThan(1.8);
  });

  it('el tráfico doméstico pesa más que el internacional', () => {
    expect(calculateDemand(PMI, BCN, JULY, CFG).factors.domestic).toBe(
      CFG.demand.domesticMultiplier,
    );
    expect(calculateDemand(PMI, LGW, JULY, CFG).factors.domestic).toBe(1);
  });

  it('viajar dentro del espacio de libre circulación genera más tráfico', () => {
    expect(calculateDemand(PMI, BCN, JULY, CFG).factors.bloc).toBe(CFG.demand.sameBlocMultiplier);
    expect(calculateDemand(PMI, LGW, JULY, CFG).factors.bloc).toBe(
      CFG.demand.differentBlocMultiplier,
    );
  });

  it('reparte entre los tres segmentos sin perder demanda', () => {
    const d = calculateDemand(PMI, LGW, JULY, CFG);
    expect(d.bySegment.business + d.bySegment.leisure + d.bySegment.vfr).toBeCloseTo(d.total, 6);
  });

  it('un destino de ocio inclina el par hacia el segmento de ocio', () => {
    const d = calculateDemand(PMI, LGW, JULY, CFG);
    expect(d.bySegment.leisure).toBeGreaterThan(d.bySegment.business);
  });

  it('devuelve cero fuera del alcance modelado', () => {
    const beyond = { ...LGW, latitude: -41.3, longitude: 174.8 };
    expect(calculateDemand(PMI, beyond, JULY, CFG).total).toBe(0);
  });

  it('es determinista', () => {
    expect(calculateDemand(PMI, LGW, JULY, CFG)).toEqual(calculateDemand(PMI, LGW, JULY, CFG));
  });
});

describe('utilidad y horario', () => {
  it('el segmento business valora salir a primera hora local', () => {
    const early = timeOfDayScore(7 * 60 - 60, 60, 'business', CFG);
    const night = timeOfDayScore(3 * 60 - 60, 60, 'business', CFG);
    expect(early).toBeGreaterThan(0.9);
    expect(night).toBeLessThan(0.35);
    expect(night).toBeGreaterThan(0); // caro, pero no imposible de vender
  });

  it('la hora se evalúa en local, no en UTC', () => {
    // Las 07:00 locales puntúan igual salgan de un huso o de otro.
    const spain = timeOfDayScore(6 * 60, 60, 'business', CFG);
    const uk = timeOfDayScore(7 * 60, 0, 'business', CFG);
    expect(spain).toBeCloseTo(uk, 6);
  });

  it('subir el precio baja la utilidad, y más en ocio que en business', () => {
    const cheap = option({ key: 'cheap' });
    const pricey = option({
      key: 'pricey',
      prices: {
        economy: money(MARKET.referenceFares.economy * 2),
        business: money(MARKET.referenceFares.business * 2),
      },
    });

    const businessDrop =
      calculateUtility(cheap, 'business', MARKET, CFG) -
      calculateUtility(pricey, 'business', MARKET, CFG);
    const leisureDrop =
      calculateUtility(cheap, 'leisure', MARKET, CFG) -
      calculateUtility(pricey, 'leisure', MARKET, CFG);

    expect(businessDrop).toBeGreaterThan(0);
    expect(leisureDrop).toBeGreaterThan(businessDrop);
  });

  it('la calidad de cabina premia el espacio y el servicio', () => {
    const dense = cabinQualityScore({ economy: 186, business: 0 }, 186, 0);
    const comfortable = cabinQualityScore({ economy: 150, business: 12 }, 186, 3);
    expect(comfortable).toBeGreaterThan(dense);
  });
});

describe('reparto de la demanda', () => {
  const demand = { business: 60, leisure: 180, vfr: 70 };

  it('sin ofertas, toda la demanda se queda en casa', () => {
    const result = allocateDemand([], demand, MARKET, CFG);
    expect(result.noFlyDemand).toBe(310);
    expect(result.byOption.size).toBe(0);
  });

  it('parte del mercado nunca vuela: la opción exterior está en el denominador', () => {
    const result = allocateDemand([option({ key: 'solo' })], demand, MARKET, CFG);
    expect(result.noFlyDemand).toBeGreaterThan(0);
  });

  it('el más barato se lleva más cuota que el más caro', () => {
    const result = allocateDemand(
      [
        option({
          key: 'barato',
          prices: { economy: money(6_000), business: MARKET.referenceFares.business },
        }),
        option({
          key: 'caro',
          prices: { economy: money(14_000), business: MARKET.referenceFares.business },
        }),
      ],
      demand,
      MARKET,
      CFG,
    );
    const cheap = result.byOption.get('barato');
    const expensive = result.byOption.get('caro');
    expect(cheap!.pax.economy).toBeGreaterThan(expensive!.pax.economy);
  });

  it('no se puede ganar sólo con precio: puntualidad y reputación pesan', () => {
    const result = allocateDemand(
      [
        option({
          key: 'barato-malo',
          prices: { economy: money(7_000), business: MARKET.referenceFares.business },
          reputation: 25,
          onTimeRate: 55,
        }),
        option({
          key: 'caro-bueno',
          prices: { economy: money(9_500), business: MARKET.referenceFares.business },
          reputation: 92,
          onTimeRate: 94,
        }),
      ],
      demand,
      MARKET,
      CFG,
    );
    const good = result.byOption.get('caro-bueno');
    const cheap = result.byOption.get('barato-malo');
    expect(good!.pax.economy).toBeGreaterThan(0);
    expect(cheap!.pax.economy).toBeGreaterThan(0);
    // Ninguno arrasa: hay más de una forma de competir.
    const ratio = good!.pax.economy / cheap!.pax.economy;
    expect(ratio).toBeGreaterThan(0.4);
    expect(ratio).toBeLessThan(2.5);
  });

  it('cada frecuencia añadida aporta menos que la anterior', () => {
    const marginalGain = (base: number): number => {
      const result = allocateDemand(
        [
          option({ key: 'mas', weeklyFrequency: base + 1 }),
          option({ key: 'base', weeklyFrequency: base }),
        ],
        demand,
        MARKET,
        CFG,
      );
      return result.byOption.get('mas')!.pax.economy - result.byOption.get('base')!.pax.economy;
    };

    // Añadir la segunda frecuencia semanal aporta mucho más que añadir la octava.
    // Es lo que impide comprar cuota de mercado a base de aviones: la utilidad
    // entra como log(1+f) mientras que los asientos crecen linealmente.
    expect(marginalGain(1)).toBeGreaterThan(marginalGain(7));
  });

  it('LA PROPIEDAD CLAVE: añadir capacidad no crea pasajeros, sólo diluye la ocupación', () => {
    // docs/04 §4.2: el jugador que compra aviones y los tira a la misma ruta
    // no gana cuota proporcional; se queda con los aviones más vacíos.
    const one = allocateDemand([option({ key: 'v1' })], demand, MARKET, CFG);
    const two = allocateDemand([option({ key: 'v1' }), option({ key: 'v2' })], demand, MARKET, CFG);

    const paxOne = one.byOption.get('v1')!.pax.economy + one.byOption.get('v1')!.pax.business;
    const paxTwoTotal =
      two.byOption.get('v1')!.pax.economy +
      two.byOption.get('v1')!.pax.business +
      two.byOption.get('v2')!.pax.economy +
      two.byOption.get('v2')!.pax.business;

    // Doblar la oferta no dobla el pasaje transportado...
    expect(paxTwoTotal).toBeLessThan(paxOne * 2);
    // ...y cada avión vuela más vacío que antes.
    expect(two.byOption.get('v1')!.loadFactor).toBeLessThan(one.byOption.get('v1')!.loadFactor);
  });

  it('cuando el dominante se llena, el pequeño recibe el derrame', () => {
    const big = option({
      key: 'grande',
      seats: { economy: 60, business: 0 },
      reputation: 95,
      onTimeRate: 95,
    });
    const small = option({
      key: 'pequeño',
      seats: { economy: 170, business: 0 },
      reputation: 30,
      onTimeRate: 60,
    });

    const heavyDemand = { business: 200, leisure: 600, vfr: 200 };
    const result = allocateDemand([big, small], heavyDemand, MARKET, CFG);

    // El dominante se llena por completo...
    expect(result.byOption.get('grande')!.pax.economy).toBe(60);
    // ...y el resto de la demanda va al competidor, que ahora vende.
    expect(result.byOption.get('pequeño')!.pax.economy).toBeGreaterThan(60);
  });

  it('nunca asigna más pasajeros que asientos', () => {
    const tiny = option({ key: 'mini', seats: { economy: 12, business: 2 } });
    const result = allocateDemand([tiny], { business: 500, leisure: 900, vfr: 400 }, MARKET, CFG);
    const allocation = result.byOption.get('mini')!;
    expect(allocation.pax.economy).toBeLessThanOrEqual(12);
    expect(allocation.pax.business).toBeLessThanOrEqual(2);
    expect(result.unservedDemand).toBeGreaterThan(0);
  });

  it('es determinista', () => {
    const options = [option({ key: 'a' }), option({ key: 'b', weeklyFrequency: 3 })];
    const first = allocateDemand(options, demand, MARKET, CFG);
    const second = allocateDemand(options, demand, MARKET, CFG);
    expect([...first.byOption.entries()]).toEqual([...second.byOption.entries()]);
  });
});
