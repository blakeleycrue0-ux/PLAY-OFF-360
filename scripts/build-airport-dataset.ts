import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseCsvRecords } from './lib/csv.js';
import {
  NORMALISER_VERSION,
  SCHENGEN_COUNTRIES,
  displayCity,
  feesFor,
  provisionalBusinessIndex,
  provisionalLeisureIndex,
  provisionalMarketWeight,
  provisionalSeasonality,
  sizeClassFor,
  timezoneFor,
  utcOffsetMinutes,
  type RawAirport,
} from './lib/airport-normalisation.js';

/**
 * Etapa 2 de la importación de aeropuertos (ADR-011): normalización.
 *
 * Lee los CSV descargados, filtra Europa, deriva los parámetros de juego y
 * escribe un snapshot versionado con su procedencia. El snapshot SÍ se
 * versiona en git: es lo que hace la construcción reproducible sin red.
 *
 *   pnpm data:build-airports -- --limit 300
 */

const ROOT = path.resolve(import.meta.dirname, '..');
const SOURCE_DIR = path.join(ROOT, 'data', 'source');
const OUT_FILE = path.join(ROOT, 'data', 'airports.europe.json');

const DEFAULT_LIMIT = 300;

function argValue(name: string, fallback: number): number {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return fallback;
  return Number(process.argv[index + 1] ?? fallback);
}

interface RunwayInfo {
  readonly count: number;
  readonly longestFt: number;
}

function buildRunwayIndex(csv: string): ReadonlyMap<string, RunwayInfo> {
  const index = new Map<string, { count: number; longestFt: number }>();

  for (const row of parseCsvRecords(csv)) {
    if (row['closed'] === '1') continue;
    const ident = row['airport_ident'] ?? '';
    const lengthFt = Number(row['length_ft'] ?? 0);
    if (ident === '' || !Number.isFinite(lengthFt) || lengthFt <= 0) continue;

    const existing = index.get(ident) ?? { count: 0, longestFt: 0 };
    index.set(ident, {
      count: existing.count + 1,
      longestFt: Math.max(existing.longestFt, lengthFt),
    });
  }

  return index;
}

interface EligibleRow {
  readonly iata: string;
  readonly icao: string;
  readonly country: string;
  readonly region: string;
  readonly type: 'large_airport' | 'medium_airport';
  readonly runway: RunwayInfo;
  readonly latitude: number;
  readonly longitude: number;
}

/**
 * Decide si una fila de la fuente entra en el conjunto de datos y, de paso,
 * devuelve ya convertidos los campos que hacen falta.
 *
 * El filtro geográfico **no** es el continente que trae la fuente: OurAirports
 * clasifica Canarias como África y Rodas como Asia, lo cual es geográficamente
 * correcto y comercialmente irrelevante —son mercados europeos y están entre
 * los destinos con más tráfico del continente—. El criterio es la lista de
 * países europeos, la misma que resuelve la zona horaria.
 */
function eligibleRow(
  row: Readonly<Record<string, string>>,
  runways: ReadonlyMap<string, RunwayInfo>,
): EligibleRow | null {
  const type = row['type'];
  if (type !== 'large_airport' && type !== 'medium_airport') return null;
  if (row['scheduled_service'] !== 'yes') return null;

  const iata = (row['iata_code'] ?? '').trim().toUpperCase();
  const icao = (row['icao_code'] ?? row['ident'] ?? '').trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(iata) || !/^[A-Z0-9]{4}$/.test(icao)) return null;

  // Sin datos de pista no se puede validar qué aviones pueden operar, y esa
  // validación es una regla del juego. Se descarta antes que inventarla.
  const runway = runways.get(row['ident'] ?? '');
  if (runway === undefined || runway.longestFt < 3_000) return null;

  const country = (row['iso_country'] ?? '').toUpperCase();
  const region = (row['iso_region'] ?? '').toUpperCase();
  if (timezoneFor(country, region) === null) return null;

  const latitude = Number(row['latitude_deg']);
  const longitude = Number(row['longitude_deg']);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  return { iata, icao, country, region, type, runway, latitude, longitude };
}

function collectEuropeanAirports(
  airportsCsv: string,
  runways: ReadonlyMap<string, RunwayInfo>,
): readonly RawAirport[] {
  const result: RawAirport[] = [];

  for (const row of parseCsvRecords(airportsCsv)) {
    const eligible = eligibleRow(row, runways);
    if (eligible === null) continue;

    result.push({
      iata: eligible.iata,
      icao: eligible.icao,
      name: (row['name'] ?? '').trim(),
      city: (row['municipality'] ?? '').trim() || (row['name'] ?? '').trim(),
      country: eligible.country,
      region: eligible.region,
      latitude: eligible.latitude,
      longitude: eligible.longitude,
      elevationFt: Number(row['elevation_ft'] ?? 0) || 0,
      type: eligible.type,
      runwayCount: eligible.runway.count,
      longestRunwayFt: Math.round(eligible.runway.longestFt),
    });
  }

  return result;
}

function normalise(raw: RawAirport): Record<string, unknown> {
  const marketWeight = provisionalMarketWeight(raw);
  const sizeClass = sizeClassFor(marketWeight);
  const fees = feesFor(sizeClass);
  const leisureIndex = provisionalLeisureIndex(raw);
  const timezone = timezoneFor(raw.country, raw.region) ?? 'UTC';

  return {
    iata: raw.iata,
    icao: raw.icao,
    name: raw.name,
    // Nombre corto para enseñar; el índice de negocio sigue leyendo el
    // municipio de la fuente a través de `raw`.
    city: displayCity(raw.city, raw.iata),
    country: raw.country,
    latitude: Math.round(raw.latitude * 1e6) / 1e6,
    longitude: Math.round(raw.longitude * 1e6) / 1e6,
    elevationFt: raw.elevationFt,
    timezone,
    utcOffsetMinutes: utcOffsetMinutes(timezone),
    schengen: SCHENGEN_COUNTRIES.has(raw.country),
    runwayCount: raw.runwayCount,
    longestRunwayFt: raw.longestRunwayFt,
    sizeClass,
    landingFeeCentsPerTonne: fees.landing,
    paxFeeCents: fees.pax,
    handlingFeeCents: fees.handling,
    marketWeight,
    businessIndex: provisionalBusinessIndex(raw),
    leisureIndex,
    seasonality: provisionalSeasonality(leisureIndex),
  };
}

async function main(): Promise<void> {
  const limit = argValue('limit', DEFAULT_LIMIT);

  const [airportsCsv, runwaysCsv, manifestRaw] = await Promise.all([
    readFile(path.join(SOURCE_DIR, 'airports.csv'), 'utf8'),
    readFile(path.join(SOURCE_DIR, 'runways.csv'), 'utf8'),
    readFile(path.join(SOURCE_DIR, 'manifest.json'), 'utf8').catch(() => '{}'),
  ]);

  const runways = buildRunwayIndex(runwaysCsv);
  const candidates = collectEuropeanAirports(airportsCsv, runways);

  // Se ordena por tamaño de mercado y se recorta: un mundo denso y pequeño es
  // mejor que uno grande y vacío (docs/09 §9.1).
  const selected = [...candidates]
    .sort((a, b) => provisionalMarketWeight(b) - provisionalMarketWeight(a))
    .slice(0, limit)
    .map(normalise)
    .sort((a, b) => String(a['iata']).localeCompare(String(b['iata'])));

  const dataset = {
    $schema: 'https://airline-sim.invalid/schemas/airports-v1.json',
    provenance: {
      source: 'OurAirports (https://ourairports.com/data/)',
      license: 'Dominio público (Unlicense)',
      sourceManifest: JSON.parse(manifestRaw) as unknown,
      normaliserVersion: NORMALISER_VERSION,
      builtAt: new Date().toISOString(),
      filters: {
        scope:
          'Países europeos (incluye territorios ultramarinos de mercado europeo: Canarias, Madeira, Azores, Egeo)',
        types: ['large_airport', 'medium_airport'],
        scheduledService: true,
        minLongestRunwayFt: 3_000,
        requiresIataAndIcao: true,
        limit,
      },
      warning:
        'marketWeight, businessIndex, leisureIndex y seasonality son PROVISIONALES: ' +
        'se derivan de hechos observables de OurAirports, no de tráfico real de pasajeros. ' +
        'Ver pendientes C-1, C-5, C-6 y C-7 en docs/decisions.md.',
    },
    count: selected.length,
    airports: selected,
  };

  const json = `${JSON.stringify(dataset, null, 2)}\n`;
  await writeFile(OUT_FILE, json);

  const countries = new Set(selected.map((a) => a['country']));
  console.log(`Candidatos europeos con servicio comercial: ${candidates.length}`);
  console.log(`Seleccionados: ${selected.length} en ${countries.size} países`);
  console.log(
    `SHA-256 del snapshot: ${createHash('sha256').update(json).digest('hex').slice(0, 16)}…`,
  );
  console.log(`Escrito en ${path.relative(ROOT, OUT_FILE)}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
