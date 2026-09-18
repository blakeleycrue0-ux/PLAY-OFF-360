import {
  accountId,
  aircraftId,
  aircraftTypeCode,
  airlineId,
  airportCode,
  countryCode,
  minutes,
  money,
  routeId,
  scheduleId,
  worldId,
  flightId,
} from '@airline/shared';
import type {
  Aircraft,
  AircraftType,
  Airline,
  Airport,
  Flight,
  FlightSchedule,
  Route,
  World,
} from '@airline/domain';
import { fromDbTimestamp, fromDbTimestampOrNull } from './common.js';

type Row = Record<string, any>;

export function toWorld(row: Row): World {
  return {
    id: worldId(row['id']),
    name: row['name'],
    seed: Number(row['seed']),
    timeScale: Number(row['time_scale']),
    startedAt: fromDbTimestamp(row['started_at']),
    configVersion: row['config_version'],
    fuelPriceCentsPerKg: Number(row['fuel_price_cents_per_kg']),
    status: row['status'],
  };
}

export function toAirport(row: Row): Airport {
  return {
    iata: airportCode(row['iata']),
    icao: row['icao'],
    name: row['name'],
    city: row['city'],
    country: countryCode(row['country']),
    latitude: Number(row['latitude']),
    longitude: Number(row['longitude']),
    elevationFt: Number(row['elevation_ft']),
    timezone: row['timezone'],
    utcOffsetMinutes: Number(row['utc_offset_minutes']),
    schengen: Boolean(row['schengen']),
    runwayCount: Number(row['runway_count']),
    longestRunwayFt: Number(row['longest_runway_ft']),
    sizeClass: Number(row['size_class']) as Airport['sizeClass'],
    landingFeeCentsPerTonne: Number(row['landing_fee_cents_per_tonne']),
    paxFeeCents: Number(row['pax_fee_cents']),
    handlingFeeCents: Number(row['handling_fee_cents']),
    marketWeight: Number(row['market_weight']),
    businessIndex: Number(row['business_index']),
    leisureIndex: Number(row['leisure_index']),
    seasonality: row['seasonality'] as number[],
  };
}

export function toAircraftType(row: Row): AircraftType {
  return {
    code: aircraftTypeCode(row['code']),
    name: row['name'],
    category: row['category'],
    family: row['family'],
    maxSeats: Number(row['max_seats']),
    typicalSeats: Number(row['typical_seats']),
    rangeKm: Number(row['range_km']),
    cruiseSpeedKmh: Number(row['cruise_speed_kmh']),
    mtowKg: Number(row['mtow_kg']),
    minRunwayFt: Number(row['min_runway_ft']),
    fuelBurnKgPerHour: Number(row['fuel_burn_kg_per_hour']),
    crewCockpit: Number(row['crew_cockpit']),
    cabinCrewPer50Seats: Number(row['cabin_crew_per_50_seats']),
    priceCents: Number(row['price_cents']),
    leaseRateMonthCents: Number(row['lease_rate_month_cents']),
    maintCostHourCents: Number(row['maint_cost_hour_cents']),
    baseReliability: Number(row['base_reliability']),
    turnaroundMinutes: Number(row['turnaround_minutes']),
  };
}

export function toAirline(row: Row): Airline {
  return {
    id: airlineId(row['id']),
    worldId: worldId(row['world_id']),
    accountId: row['account_id'] === null ? null : accountId(row['account_id']),
    name: row['name'],
    iataCode: row['iata_code'],
    icaoCode: row['icao_code'],
    country: countryCode(row['country']),
    hub: airportCode(row['hub']),
    businessModel: row['business_model'],
    controller: row['controller'],
    npcStrategy: row['npc_strategy'],
    cash: money(Number(row['cash_cents'])),
    reputation: Number(row['reputation']),
    onTimeRate: Number(row['on_time_rate']),
    foundedAt: fromDbTimestamp(row['founded_at']),
    isActive: Boolean(row['is_active']),
  };
}

export function toAircraft(row: Row): Aircraft {
  return {
    id: aircraftId(row['id']),
    worldId: worldId(row['world_id']),
    airlineId: airlineId(row['airline_id']),
    typeCode: aircraftTypeCode(row['type_code']),
    registration: row['registration'],
    ownership: row['ownership'],
    leaseRate: row['lease_rate_cents'] === null ? null : money(Number(row['lease_rate_cents'])),
    purchasePrice:
      row['purchase_price_cents'] === null ? null : money(Number(row['purchase_price_cents'])),
    config: { economy: Number(row['config'].economy), business: Number(row['config'].business) },
    builtYear: Number(row['built_year']),
    flightHours: Number(row['flight_hours']),
    cycles: Number(row['cycles']),
    condition: Number(row['condition']),
    nextCheckType: row['next_check_type'],
    nextCheckAtHours: Number(row['next_check_at_hours']),
    deferredChecks: Number(row['deferred_checks']),
    status: row['status'],
    currentAirport: airportCode(row['current_airport']),
    availableAt: fromDbTimestamp(row['available_at']),
  };
}

export function toRoute(row: Row): Route {
  return {
    id: routeId(row['id']),
    worldId: worldId(row['world_id']),
    airlineId: airlineId(row['airline_id']),
    origin: airportCode(row['origin']),
    destination: airportCode(row['destination']),
    distanceKm: Number(row['distance_km']),
    prices: {
      economy: money(Number(row['prices'].economy)),
      business: money(Number(row['prices'].business)),
    },
    serviceLevel: Number(row['service_level']),
    status: row['status'],
  };
}

export function toFlightSchedule(row: Row): FlightSchedule {
  return {
    id: scheduleId(row['id']),
    routeId: routeId(row['route_id']),
    aircraftId: aircraftId(row['aircraft_id']),
    daysOfWeek: Number(row['days_of_week']),
    departureMinuteUtc: minutes(Number(row['departure_minute_utc'])),
    flightNumber: row['flight_number'],
    validFrom: fromDbTimestamp(row['valid_from']),
    validTo: fromDbTimestampOrNull(row['valid_to']),
    isActive: Boolean(row['is_active']),
  };
}

export function toFlight(row: Row): Flight {
  return {
    id: flightId(row['id']),
    worldId: worldId(row['world_id']),
    airlineId: airlineId(row['airline_id']),
    routeId: routeId(row['route_id']),
    aircraftId: aircraftId(row['aircraft_id']),
    scheduleId: row['schedule_id'] === null ? null : scheduleId(row['schedule_id']),
    flightNumber: row['flight_number'],
    origin: airportCode(row['origin']),
    destination: airportCode(row['destination']),
    scheduledDeparture: fromDbTimestamp(row['scheduled_departure']),
    scheduledArrival: fromDbTimestamp(row['scheduled_arrival']),
    seatsOffered: {
      economy: Number(row['seats_offered'].economy),
      business: Number(row['seats_offered'].business),
    },
    prices: {
      economy: money(Number(row['prices'].economy)),
      business: money(Number(row['prices'].business)),
    },
    actualDeparture: fromDbTimestampOrNull(row['actual_departure']),
    actualArrival: fromDbTimestampOrNull(row['actual_arrival']),
    status: row['status'],
    delayMinutes: minutes(Number(row['delay_minutes'])),
    pax:
      row['pax'] === null
        ? null
        : { economy: Number(row['pax'].economy), business: Number(row['pax'].business) },
    loadFactor: row['load_factor'] === null ? null : Number(row['load_factor']),
    revenue: row['revenue_cents'] === null ? null : money(Number(row['revenue_cents'])),
    cost: row['cost_cents'] === null ? null : money(Number(row['cost_cents'])),
    profit: row['profit_cents'] === null ? null : money(Number(row['profit_cents'])),
    fuelKg: row['fuel_kg'] === null ? null : Number(row['fuel_kg']),
    resolvedAt: fromDbTimestampOrNull(row['resolved_at']),
  };
}
