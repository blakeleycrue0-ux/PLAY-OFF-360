import type { Airport } from '@airline/domain';
import type { AirportCode, CountryCode } from '@airline/shared';
import { toAirport } from '../mappers/entities.js';
import type { Queryable } from '../pool.js';

/**
 * La geometría se guarda una sola vez, en `location`. La latitud y la longitud
 * se derivan al leer para que no puedan divergir de ella.
 */
const COLUMNS = `
  iata, icao, name, city, country,
  ST_Y(location::geometry) AS latitude,
  ST_X(location::geometry) AS longitude,
  elevation_ft, timezone, utc_offset_minutes, schengen,
  runway_count, longest_runway_ft, size_class,
  landing_fee_cents_per_tonne, pax_fee_cents, handling_fee_cents,
  market_weight, business_index, leisure_index, seasonality`;

export async function findAirport(db: Queryable, iata: AirportCode): Promise<Airport | null> {
  const result = await db.query(`SELECT ${COLUMNS} FROM airports WHERE iata = $1`, [iata]);
  const row = result.rows[0];
  return row === undefined ? null : toAirport(row);
}

export async function findAirports(
  db: Queryable,
  codes: readonly AirportCode[],
): Promise<ReadonlyMap<string, Airport>> {
  if (codes.length === 0) return new Map();
  const result = await db.query(`SELECT ${COLUMNS} FROM airports WHERE iata = ANY($1)`, [codes]);
  return new Map(result.rows.map((row) => [String(row['iata']), toAirport(row)]));
}

export async function listAirports(
  db: Queryable,
  options: {
    readonly country?: CountryCode;
    readonly minSizeClass?: number;
    readonly limit?: number;
  } = {},
): Promise<readonly Airport[]> {
  const result = await db.query(
    `SELECT ${COLUMNS} FROM airports
     WHERE ($1::char(2) IS NULL OR country = $1)
       AND size_class >= $2
     ORDER BY market_weight DESC
     LIMIT $3`,
    [options.country ?? null, options.minSizeClass ?? 1, options.limit ?? 1000],
  );
  return result.rows.map(toAirport);
}

/**
 * Aeropuertos dentro de un rectángulo geográfico. Es la consulta que necesita
 * el mapa, y la razón de que exista el índice GIST sobre `location`.
 */
export async function findAirportsWithin(
  db: Queryable,
  bbox: {
    readonly minLon: number;
    readonly minLat: number;
    readonly maxLon: number;
    readonly maxLat: number;
  },
  limit = 500,
): Promise<readonly Airport[]> {
  const result = await db.query(
    `SELECT ${COLUMNS} FROM airports
     WHERE location && ST_MakeEnvelope($1, $2, $3, $4, 4326)::geography
     ORDER BY market_weight DESC
     LIMIT $5`,
    [bbox.minLon, bbox.minLat, bbox.maxLon, bbox.maxLat, limit],
  );
  return result.rows.map(toAirport);
}

export interface AirportSeedRow extends Omit<Airport, 'latitude' | 'longitude'> {
  readonly latitude: number;
  readonly longitude: number;
}

/**
 * Importación idempotente del conjunto de aeropuertos (ADR-011). Reimportar
 * actualiza los datos sin borrar nada que dependa de ellos.
 */
export async function upsertAirports(
  db: Queryable,
  airports: readonly AirportSeedRow[],
  source: string,
): Promise<number> {
  let written = 0;

  for (const a of airports) {
    await db.query(
      `INSERT INTO airports (
         iata, icao, name, city, country, location, elevation_ft, timezone, utc_offset_minutes,
         schengen, runway_count, longest_runway_ft, size_class,
         landing_fee_cents_per_tonne, pax_fee_cents, handling_fee_cents,
         market_weight, business_index, leisure_index, seasonality, source
       ) VALUES (
         $1, $2, $3, $4, $5, ST_SetSRID(ST_MakePoint($6, $7), 4326)::geography, $8, $9, $10,
         $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21::jsonb, $22
       )
       ON CONFLICT (iata) DO UPDATE SET
         icao = EXCLUDED.icao, name = EXCLUDED.name, city = EXCLUDED.city,
         country = EXCLUDED.country, location = EXCLUDED.location,
         elevation_ft = EXCLUDED.elevation_ft, timezone = EXCLUDED.timezone,
         utc_offset_minutes = EXCLUDED.utc_offset_minutes, schengen = EXCLUDED.schengen,
         runway_count = EXCLUDED.runway_count, longest_runway_ft = EXCLUDED.longest_runway_ft,
         size_class = EXCLUDED.size_class,
         landing_fee_cents_per_tonne = EXCLUDED.landing_fee_cents_per_tonne,
         pax_fee_cents = EXCLUDED.pax_fee_cents, handling_fee_cents = EXCLUDED.handling_fee_cents,
         market_weight = EXCLUDED.market_weight, business_index = EXCLUDED.business_index,
         leisure_index = EXCLUDED.leisure_index, seasonality = EXCLUDED.seasonality,
         source = EXCLUDED.source, imported_at = now()`,
      [
        a.iata,
        a.icao,
        a.name,
        a.city,
        a.country,
        a.longitude,
        a.latitude,
        a.elevationFt,
        a.timezone,
        a.utcOffsetMinutes,
        a.schengen,
        a.runwayCount,
        a.longestRunwayFt,
        a.sizeClass,
        a.landingFeeCentsPerTonne,
        a.paxFeeCents,
        a.handlingFeeCents,
        a.marketWeight,
        a.businessIndex,
        a.leisureIndex,
        JSON.stringify(a.seasonality),
        source,
      ],
    );
    written += 1;
  }

  return written;
}
