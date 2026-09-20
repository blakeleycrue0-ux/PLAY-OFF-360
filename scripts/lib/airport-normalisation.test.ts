import { describe, expect, it } from 'vitest';
import { parseCsv, parseCsvRecords } from './csv.js';
import {
  SCHENGEN_COUNTRIES,
  feesFor,
  provisionalBusinessIndex,
  provisionalLeisureIndex,
  provisionalMarketWeight,
  provisionalSeasonality,
  sizeClassFor,
  timezoneFor,
  utcOffsetMinutes,
  type RawAirport,
} from './airport-normalisation.js';

function airport(overrides: Partial<RawAirport> = {}): RawAirport {
  return {
    iata: 'PMI',
    icao: 'LEPA',
    name: 'Palma de Mallorca',
    city: 'Palma de Mallorca',
    country: 'ES',
    region: 'ES-IB',
    latitude: 39.5517,
    longitude: 2.73881,
    elevationFt: 27,
    type: 'large_airport',
    runwayCount: 2,
    longestRunwayFt: 10_728,
    ...overrides,
  };
}

describe('lector de CSV', () => {
  it('lee campos entrecomillados con comas dentro', () => {
    expect(parseCsv('a,"b,c",d\n')).toEqual([['a', 'b,c', 'd']]);
  });

  it('lee comillas escapadas', () => {
    expect(parseCsv('"dice ""hola""",x\n')).toEqual([['dice "hola"', 'x']]);
  });

  it('lee saltos de línea dentro de un campo', () => {
    expect(parseCsv('"linea1\nlinea2",b\n')).toEqual([['linea1\nlinea2', 'b']]);
  });

  it('indexa por cabecera', () => {
    const records = parseCsvRecords('iata,name\nPMI,Palma\nLGW,Gatwick\n');
    expect(records).toHaveLength(2);
    expect(records[0]?.['iata']).toBe('PMI');
    expect(records[1]?.['name']).toBe('Gatwick');
  });

  it('un CSV vacío no rompe nada', () => {
    expect(parseCsvRecords('')).toEqual([]);
  });
});

describe('normalización de aeropuertos', () => {
  it('un aeropuerto grande pesa más que uno mediano', () => {
    const big = provisionalMarketWeight(airport());
    const medium = provisionalMarketWeight(airport({ type: 'medium_airport' }));
    expect(big).toBeGreaterThan(medium);
  });

  it('más pista y más pistas pesan más', () => {
    expect(provisionalMarketWeight(airport({ longestRunwayFt: 13_000 }))).toBeGreaterThan(
      provisionalMarketWeight(airport({ longestRunwayFt: 8_000 })),
    );
    expect(provisionalMarketWeight(airport({ runwayCount: 4 }))).toBeGreaterThan(
      provisionalMarketWeight(airport({ runwayCount: 1 })),
    );
  });

  it('las Baleares son mercado de ocio y Fráncfort no', () => {
    expect(provisionalLeisureIndex(airport({ region: 'ES-IB' }))).toBeGreaterThan(0.9);
    expect(provisionalLeisureIndex(airport({ region: 'DE-HE' }))).toBeLessThan(0.6);
  });

  it('reconoce las capitales de negocios aunque el municipio no sea el nombre corto', () => {
    // La fuente llama "Frankfurt am Main" a Fráncfort y "Spata-Artemida" a Atenas.
    expect(
      provisionalBusinessIndex(airport({ city: 'Frankfurt am Main', region: 'DE-HE' })),
    ).toBeGreaterThan(0.8);
    expect(
      provisionalBusinessIndex(airport({ city: 'Düsseldorf', region: 'DE-NW' })),
    ).toBeGreaterThan(0.8);
    expect(provisionalBusinessIndex(airport({ city: 'Cuenca', region: 'ES-CM' }))).toBeLessThan(
      0.6,
    );
  });

  it('un destino de ocio es muy estacional y un hub de negocios casi plano', () => {
    const leisure = provisionalSeasonality(0.97);
    const business = provisionalSeasonality(0.45);

    expect(leisure[6]).toBeGreaterThan(2.4); // julio
    expect(leisure[1]).toBeLessThan(0.65); // febrero
    expect(business[6]).toBeLessThan(1.4);
    expect(business[1]).toBeGreaterThan(0.85);
  });

  it('la estacionalidad siempre tiene doce meses y valores positivos', () => {
    for (const index of [0, 0.35, 0.5, 0.98]) {
      const curve = provisionalSeasonality(index);
      expect(curve).toHaveLength(12);
      expect(curve.every((v) => v > 0)).toBe(true);
    }
  });

  it('la clase de tamaño crece con el peso y las tasas con la clase', () => {
    expect(sizeClassFor(400)).toBe(5);
    expect(sizeClassFor(30)).toBe(1);
    expect(feesFor(5).pax).toBeGreaterThan(feesFor(1).pax);
    expect(feesFor(5).landing).toBeGreaterThan(feesFor(1).landing);
  });

  it('resuelve la zona horaria por país y sus excepciones insulares', () => {
    expect(timezoneFor('ES', 'ES-IB')).toBe('Europe/Madrid');
    expect(timezoneFor('ES', 'ES-CN')).toBe('Atlantic/Canary');
    expect(timezoneFor('PT', 'PT-20')).toBe('Atlantic/Azores');
    expect(timezoneFor('XX', 'XX-01')).toBeNull();
  });

  it('calcula el desfase horario estándar', () => {
    expect(utcOffsetMinutes('Europe/Madrid')).toBe(60);
    expect(utcOffsetMinutes('Europe/London')).toBe(0);
    expect(utcOffsetMinutes('Atlantic/Canary')).toBe(0);
    expect(utcOffsetMinutes('Europe/Athens')).toBe(120);
    expect(utcOffsetMinutes('zona/inexistente')).toBe(0);
  });

  it('la lista de Schengen incluye a los países esperados', () => {
    expect(SCHENGEN_COUNTRIES.has('ES')).toBe(true);
    expect(SCHENGEN_COUNTRIES.has('DE')).toBe(true);
    expect(SCHENGEN_COUNTRIES.has('GB')).toBe(false);
    expect(SCHENGEN_COUNTRIES.has('TR')).toBe(false);
  });
});
