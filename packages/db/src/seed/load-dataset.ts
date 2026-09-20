import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { aircraftTypeCode, airportCode, countryCode } from '@airline/shared';
import type { AircraftType, Airport } from '@airline/domain';

/**
 * Carga los conjuntos de datos versionados (etapa 3 de ADR-011).
 *
 * Los ficheros viven en `data/` en la raíz del repositorio. La ruta se resuelve
 * subiendo desde este módulo, de modo que funciona igual ejecutando desde
 * `src` con tsx que desde `dist` compilado.
 */
const DATA_DIR = path.resolve(import.meta.dirname, '..', '..', '..', '..', 'data');

interface AirportDataset {
  readonly provenance: { readonly source: string; readonly builtAt: string };
  readonly count: number;
  readonly airports: readonly Record<string, unknown>[];
}

interface AircraftTypeDataset {
  readonly aircraftTypes: readonly Record<string, unknown>[];
}

export interface LoadedAirports {
  readonly airports: readonly Airport[];
  readonly source: string;
}

export async function loadAirportDataset(dataDir = DATA_DIR): Promise<LoadedAirports> {
  const raw = await readFile(path.join(dataDir, 'airports.europe.json'), 'utf8');
  const dataset = JSON.parse(raw) as AirportDataset;

  const airports = dataset.airports.map((row): Airport => ({
    iata: airportCode(row['iata'] as string),
    icao: row['icao'] as string,
    name: row['name'] as string,
    city: row['city'] as string,
    country: countryCode(row['country'] as string),
    latitude: row['latitude'] as number,
    longitude: row['longitude'] as number,
    elevationFt: row['elevationFt'] as number,
    timezone: row['timezone'] as string,
    utcOffsetMinutes: row['utcOffsetMinutes'] as number,
    schengen: row['schengen'] as boolean,
    runwayCount: row['runwayCount'] as number,
    longestRunwayFt: row['longestRunwayFt'] as number,
    sizeClass: row['sizeClass'] as Airport['sizeClass'],
    landingFeeCentsPerTonne: row['landingFeeCentsPerTonne'] as number,
    paxFeeCents: row['paxFeeCents'] as number,
    handlingFeeCents: row['handlingFeeCents'] as number,
    marketWeight: row['marketWeight'] as number,
    businessIndex: row['businessIndex'] as number,
    leisureIndex: row['leisureIndex'] as number,
    seasonality: row['seasonality'] as readonly number[],
  }));

  return {
    airports,
    source: `${dataset.provenance.source} · snapshot ${dataset.provenance.builtAt}`,
  };
}

export async function loadAircraftTypeDataset(
  dataDir = DATA_DIR,
): Promise<readonly AircraftType[]> {
  const raw = await readFile(path.join(dataDir, 'aircraft-types.json'), 'utf8');
  const dataset = JSON.parse(raw) as AircraftTypeDataset;

  return dataset.aircraftTypes.map((row): AircraftType => ({
    code: aircraftTypeCode(row['code'] as string),
    name: row['name'] as string,
    category: row['category'] as AircraftType['category'],
    family: row['family'] as string,
    maxSeats: row['maxSeats'] as number,
    typicalSeats: row['typicalSeats'] as number,
    rangeKm: row['rangeKm'] as number,
    cruiseSpeedKmh: row['cruiseSpeedKmh'] as number,
    mtowKg: row['mtowKg'] as number,
    minRunwayFt: row['minRunwayFt'] as number,
    fuelBurnKgPerHour: row['fuelBurnKgPerHour'] as number,
    crewCockpit: row['crewCockpit'] as number,
    cabinCrewPer50Seats: row['cabinCrewPer50Seats'] as number,
    priceCents: row['priceCents'] as number,
    leaseRateMonthCents: row['leaseRateMonthCents'] as number,
    maintCostHourCents: row['maintCostHourCents'] as number,
    baseReliability: row['baseReliability'] as number,
    turnaroundMinutes: row['turnaroundMinutes'] as number,
  }));
}
