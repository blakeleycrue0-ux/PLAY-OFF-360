import { DEFAULT_BALANCE } from '@airline/config';
import { money, toEuros } from '@airline/shared';
import { describe, expect, it } from 'vitest';
import { LGW, NB160, PMI, REG70, SMALL_FIELD, TEST_ROUTE } from '../testing/fixtures.js';
import { calculateFlightDuration } from '../time/block-time.js';
import { calculateFare, calculateReferenceFare, priceFactorOf } from './fare.js';
import { calculateFlightEconomics, type FlightEconomicsInput } from './flight-economics.js';
import { calculateFuelBurnKg, calculateFuelCost, canCoverDistance } from './fuel.js';
import { calculateOperatingCost, requiredCabinCrew } from './operating-cost.js';
import { calculateRouteProfit } from './route-profit.js';

const CFG = DEFAULT_BALANCE;
const DISTANCE = TEST_ROUTE.distanceKm;
const BLOCK = calculateFlightDuration(DISTANCE, NB160, CFG);

function economicsInput(paxEconomy: number, paxBusiness = 0): FlightEconomicsInput {
  return {
    type: NB160,
    origin: PMI,
    destination: LGW,
    distanceKm: DISTANCE,
    blockMinutes: BLOCK,
    seatsOffered: { economy: 170, business: 8 },
    prices: TEST_ROUTE.prices,
    pax: { economy: paxEconomy, business: paxBusiness },
    serviceLevel: 2,
    aircraftCondition: 100,
    fuelPriceCentsPerKg: 92,
  };
}

describe('duración de vuelo', () => {
  it('cuenta rodaje y penalización de subida y descenso, no sólo crucero', () => {
    // 1.309 km × 1,06 a 840 km/h son 99 min en el aire; el bloque añade 33.
    expect(BLOCK).toBe(132);
  });

  it('un avión más lento tarda más en la misma ruta', () => {
    expect(calculateFlightDuration(900, REG70, CFG)).toBeGreaterThan(
      calculateFlightDuration(900, NB160, CFG),
    );
  });

  it('las constantes de tierra dominan en trayectos muy cortos', () => {
    // 150 km: 11 min en el aire frente a 33 de rodaje y maniobra. Es la razón
    // de que las rutas muy cortas sean económicamente malas.
    const short = calculateFlightDuration(150, NB160, CFG);
    expect(short).toBeGreaterThan(40);
    expect(short).toBeLessThan(50);
  });

  it('nunca baja del mínimo de bloque', () => {
    expect(calculateFlightDuration(1, NB160, CFG)).toBeGreaterThanOrEqual(
      CFG.flight.minimumBlockMinutes,
    );
  });
});

describe('combustible', () => {
  it('ir lleno consume más que ir vacío', () => {
    const empty = calculateFuelBurnKg(BLOCK, NB160, 0, CFG);
    const full = calculateFuelBurnKg(BLOCK, NB160, 1, CFG);
    expect(full).toBeGreaterThan(empty);
    expect(full / empty).toBeGreaterThan(1.15);
    expect(full / empty).toBeLessThan(1.25);
  });

  it('el coste escala con el precio del mundo', () => {
    const kg = calculateFuelBurnKg(BLOCK, NB160, 0.86, CFG);
    expect(calculateFuelCost(kg, 184)).toBe(calculateFuelCost(kg, 92) * 2);
  });

  it('el alcance se comprueba sobre la distancia realmente volada', () => {
    // El alcance nominal del REG70 son 2.400 km, pero la ruta real es un 6% más larga.
    expect(canCoverDistance(2_300, REG70, CFG)).toBe(false);
    expect(canCoverDistance(2_200, REG70, CFG)).toBe(true);
  });
});

describe('tarifas', () => {
  it('el precio de referencia es cóncavo en la distancia', () => {
    const short = calculateReferenceFare(500, 'economy', CFG);
    const long = calculateReferenceFare(2_000, 'economy', CFG);
    // Cuadruplicar la distancia no cuadruplica el precio: el coste por km baja.
    expect(long).toBeLessThan(short * 4);
    expect(long).toBeGreaterThan(short);
  });

  it('reproduce el precio medio del ejemplo de docs/04 §4.9 en PMI-LGW', () => {
    expect(toEuros(calculateReferenceFare(DISTANCE, 'economy', CFG))).toBeCloseTo(92, 0);
  });

  it('acota factores de precio absurdos', () => {
    const reference = calculateReferenceFare(DISTANCE, 'economy', CFG);
    expect(calculateFare(reference, 0.001, CFG)).toBe(
      calculateFare(reference, CFG.fares.minPriceFactor, CFG),
    );
    expect(calculateFare(reference, 500, CFG)).toBe(
      calculateFare(reference, CFG.fares.maxPriceFactor, CFG),
    );
  });

  it('priceFactorOf es inverso de calculateFare dentro del rango', () => {
    const reference = calculateReferenceFare(DISTANCE, 'economy', CFG);
    expect(priceFactorOf(calculateFare(reference, 1.2, CFG), reference)).toBeCloseTo(1.2, 3);
  });
});

describe('coste operativo', () => {
  it('exige un tripulante de cabina por cada 50 plazas', () => {
    expect(requiredCabinCrew(178, NB160)).toBe(4);
    expect(requiredCabinCrew(200, NB160)).toBe(4);
    expect(requiredCabinCrew(201, NB160)).toBe(5);
  });

  it('un avión gastado cuesta más de mantener', () => {
    const base = { ...economicsInput(150) };
    const healthy = calculateOperatingCost(
      { ...toCostInput(base), aircraftCondition: 100 },
      CFG,
    ).maintenance;
    const worn = calculateOperatingCost(
      { ...toCostInput(base), aircraftCondition: 20 },
      CFG,
    ).maintenance;
    expect(worn).toBeGreaterThan(healthy);
    expect(worn / healthy).toBeCloseTo(1.48, 1);
  });

  it('un aeropuerto grande es más caro que uno pequeño', () => {
    const toBig = calculateOperatingCost(toCostInput(economicsInput(150)), CFG);
    const toSmall = calculateOperatingCost(
      { ...toCostInput(economicsInput(150)), destination: SMALL_FIELD },
      CFG,
    );
    expect(toBig.landing).toBeGreaterThan(toSmall.landing);
    expect(toBig.passengerFees).toBeGreaterThan(toSmall.passengerFees);
    expect(toBig.handling).toBeGreaterThan(toSmall.handling);
  });

  it('el total es exactamente la suma de sus partes', () => {
    const cost = calculateOperatingCost(toCostInput(economicsInput(150)), CFG);
    const sum =
      cost.fuel +
      cost.crew +
      cost.maintenance +
      cost.landing +
      cost.passengerFees +
      cost.handling +
      cost.navigation +
      cost.catering;
    expect(cost.total).toBe(sum);
  });
});

describe('economía de un vuelo', () => {
  it('con el avión lleno gana dinero y con el avión vacío lo pierde', () => {
    const full = calculateFlightEconomics(economicsInput(170, 8), CFG);
    const empty = calculateFlightEconomics(economicsInput(0, 0), CFG);

    expect(full.profit).toBeGreaterThan(0);
    expect(empty.profit).toBeLessThan(0);
    // Volar vacío no es gratis: el grueso del coste se paga igual.
    expect(Math.abs(empty.profit)).toBeGreaterThan(toEurosAsCents(8_000));
  });

  it('el resultado es ingresos menos costes, sin residuos', () => {
    const e = calculateFlightEconomics(economicsInput(150, 6), CFG);
    expect(e.profit).toBe(e.revenue.total - e.cost.total);
    expect(e.revenue.total).toBe(e.revenue.tickets + e.revenue.ancillary);
  });

  it('el factor de ocupación sale de plazas ofrecidas, no de plazas vendidas', () => {
    expect(calculateFlightEconomics(economicsInput(89, 0), CFG).loadFactor).toBeCloseTo(0.5, 2);
  });

  it('es determinista: las mismas entradas dan el mismo resultado', () => {
    expect(calculateFlightEconomics(economicsInput(150, 6), CFG)).toEqual(
      calculateFlightEconomics(economicsInput(150, 6), CFG),
    );
  });

  it('el nivel de servicio bajo cambia extras por calidad', () => {
    const bare = calculateFlightEconomics({ ...economicsInput(170, 8), serviceLevel: 0 }, CFG);
    const full = calculateFlightEconomics({ ...economicsInput(170, 8), serviceLevel: 3 }, CFG);
    expect(bare.revenue.ancillary).toBeGreaterThan(full.revenue.ancillary);
    expect(bare.cost.catering).toBeLessThan(full.cost.catering);
  });
});

describe('calibración contra el P&L de ejemplo de docs/04 §4.9', () => {
  // El ejemplo documenta PMI-LGW con un narrowbody: 42 vuelos, 7.104 pasajeros
  // y un desglose de costes. Este test protege los parámetros marcados como
  // "derived" en el registro de procedencia: si alguien los toca sin querer,
  // la economía deja de parecerse a la diseñada y el test lo dice.
  const e = calculateFlightEconomics(economicsInput(161, 8), CFG);
  const perFlight = (totalEuros: number): number => totalEuros / 42;

  // Tolerancia relativa: un ejemplo de diseño fija el orden de magnitud, no el
  // céntimo. El 8% detecta que alguien ha movido un parámetro derivado sin
  // convertir el test en un molde imposible de mantener.
  const TOLERANCE = 0.08;
  const expectWithin = (actual: number, expected: number): void => {
    const deviation = Math.abs(actual - expected) / expected;
    expect(
      deviation,
      `${actual.toFixed(2)} € se aparta un ${(deviation * 100).toFixed(1)}% de los ${expected.toFixed(2)} € documentados`,
    ).toBeLessThan(TOLERANCE);
  };

  it('el combustible por vuelo cae cerca del documentado', () => {
    expectWithin(toEuros(e.cost.fuel), perFlight(218_400));
  });

  it('la tripulación por vuelo cae cerca de la documentada', () => {
    expectWithin(toEuros(e.cost.crew), perFlight(96_180));
  });

  it('el mantenimiento por vuelo cae cerca del documentado', () => {
    expectWithin(toEuros(e.cost.maintenance), perFlight(71_400));
  });

  it('las tasas aeroportuarias por vuelo caen cerca de las documentadas', () => {
    expectWithin(toEuros(e.cost.landing) + toEuros(e.cost.passengerFees), perFlight(108_780));
  });

  it('handling y catering por vuelo caen cerca de los documentados', () => {
    expectWithin(toEuros(e.cost.handling) + toEuros(e.cost.catering), perFlight(46_480));
  });

  it('los extras por pasajero caen cerca de los documentados', () => {
    expectWithin(toEuros(e.revenue.ancillary) / e.paxTotal, 38_469 / 7_104);
  });
});

describe('rentabilidad de ruta', () => {
  it('proyecta semana y mes a partir de la frecuencia', () => {
    const forecast = calculateRouteProfit(economicsInput(150, 6), 7, CFG);
    expect(forecast.weekly.profit).toBe(forecast.perFlight.profit * 7);
    expect(forecast.monthly.profit).toBeGreaterThan(forecast.weekly.profit * 4);
  });

  it('calcula el punto de equilibrio en pasajeros', () => {
    const forecast = calculateRouteProfit(economicsInput(150, 6), 7, CFG);
    expect(forecast.breakEvenPax).toBeGreaterThan(0);
    expect(forecast.breakEvenPax).toBeLessThan(178);

    // Justo por debajo del umbral se pierde dinero y justo por encima se gana.
    const below = calculateFlightEconomics(economicsInput(forecast.breakEvenPax - 2, 0), CFG);
    const above = calculateFlightEconomics(economicsInput(forecast.breakEvenPax + 4, 0), CFG);
    expect(below.profit).toBeLessThan(above.profit);
  });

  it('una ruta que nunca cubre costes tiene punto de equilibrio infinito', () => {
    const hopeless = {
      ...economicsInput(0),
      prices: { economy: money(100), business: money(200) },
    };
    expect(calculateRouteProfit(hopeless, 7, CFG).breakEvenPax).toBe(Number.POSITIVE_INFINITY);
  });
});

function toCostInput(input: FlightEconomicsInput): Parameters<typeof calculateOperatingCost>[0] {
  return {
    type: input.type,
    origin: input.origin,
    destination: input.destination,
    distanceKm: input.distanceKm,
    blockMinutes: input.blockMinutes,
    seatsInstalled: input.seatsOffered.economy + input.seatsOffered.business,
    fuelKg: calculateFuelBurnKg(input.blockMinutes, input.type, 0.85, CFG),
    fuelPriceCentsPerKg: input.fuelPriceCentsPerKg,
    paxTotal: input.pax.economy + input.pax.business,
    serviceLevel: input.serviceLevel,
    aircraftCondition: input.aircraftCondition,
  };
}

function toEurosAsCents(euros: number): number {
  return euros * 100;
}
