import type { AircraftType } from '@airline/domain';
import type { AircraftTypeCode } from '@airline/shared';
import { toAircraftType } from '../mappers/entities.js';
import type { Queryable } from '../pool.js';

const COLUMNS = `
  code, name, category, family, max_seats, typical_seats, range_km, cruise_speed_kmh,
  mtow_kg, min_runway_ft, fuel_burn_kg_per_hour, crew_cockpit, cabin_crew_per_50_seats,
  price_cents, lease_rate_month_cents, maint_cost_hour_cents, base_reliability, turnaround_minutes`;

export async function findAircraftType(
  db: Queryable,
  code: AircraftTypeCode,
): Promise<AircraftType | null> {
  const result = await db.query(`SELECT ${COLUMNS} FROM aircraft_types WHERE code = $1`, [code]);
  const row = result.rows[0];
  return row === undefined ? null : toAircraftType(row);
}

export async function listAircraftTypes(db: Queryable): Promise<readonly AircraftType[]> {
  const result = await db.query(`SELECT ${COLUMNS} FROM aircraft_types ORDER BY max_seats`);
  return result.rows.map(toAircraftType);
}

export async function loadAircraftTypeCatalog(
  db: Queryable,
): Promise<ReadonlyMap<string, AircraftType>> {
  const types = await listAircraftTypes(db);
  return new Map(types.map((t) => [t.code, t]));
}

export async function upsertAircraftTypes(
  db: Queryable,
  types: readonly AircraftType[],
): Promise<number> {
  for (const t of types) {
    await db.query(
      `INSERT INTO aircraft_types (
         code, name, category, family, max_seats, typical_seats, range_km, cruise_speed_kmh,
         mtow_kg, min_runway_ft, fuel_burn_kg_per_hour, crew_cockpit, cabin_crew_per_50_seats,
         price_cents, lease_rate_month_cents, maint_cost_hour_cents, base_reliability, turnaround_minutes
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
       ON CONFLICT (code) DO UPDATE SET
         name = EXCLUDED.name, category = EXCLUDED.category, family = EXCLUDED.family,
         max_seats = EXCLUDED.max_seats, typical_seats = EXCLUDED.typical_seats,
         range_km = EXCLUDED.range_km, cruise_speed_kmh = EXCLUDED.cruise_speed_kmh,
         mtow_kg = EXCLUDED.mtow_kg, min_runway_ft = EXCLUDED.min_runway_ft,
         fuel_burn_kg_per_hour = EXCLUDED.fuel_burn_kg_per_hour,
         crew_cockpit = EXCLUDED.crew_cockpit,
         cabin_crew_per_50_seats = EXCLUDED.cabin_crew_per_50_seats,
         price_cents = EXCLUDED.price_cents,
         lease_rate_month_cents = EXCLUDED.lease_rate_month_cents,
         maint_cost_hour_cents = EXCLUDED.maint_cost_hour_cents,
         base_reliability = EXCLUDED.base_reliability,
         turnaround_minutes = EXCLUDED.turnaround_minutes`,
      [
        t.code,
        t.name,
        t.category,
        t.family,
        t.maxSeats,
        t.typicalSeats,
        t.rangeKm,
        t.cruiseSpeedKmh,
        t.mtowKg,
        t.minRunwayFt,
        t.fuelBurnKgPerHour,
        t.crewCockpit,
        t.cabinCrewPer50Seats,
        t.priceCents,
        t.leaseRateMonthCents,
        t.maintCostHourCents,
        t.baseReliability,
        t.turnaroundMinutes,
      ],
    );
  }
  return types.length;
}
