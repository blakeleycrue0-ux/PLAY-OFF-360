-- Mundo estático y entidades raíz.

-- Un mundo es un shard: un universo compartido e independiente (docs/05 §5.2).
CREATE TABLE worlds (
  id                       uuid PRIMARY KEY,
  name                     text NOT NULL,
  seed                     bigint NOT NULL,
  -- Velocidad del mundo. El MVP corre a 1:1 (ADR-001) pero la columna existe
  -- desde el primer día para no tener que rehacer el motor al cambiarla.
  time_scale               numeric(6,3) NOT NULL DEFAULT 1.000 CHECK (time_scale > 0),
  started_at               timestamptz NOT NULL,
  config_version           text NOT NULL,
  fuel_price_cents_per_kg  integer NOT NULL CHECK (fuel_price_cents_per_kg > 0),
  status                   text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'full', 'archived')),
  created_at               timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE accounts (
  id             uuid PRIMARY KEY,
  email          citext NOT NULL UNIQUE,
  display_name   text NOT NULL CHECK (length(display_name) BETWEEN 1 AND 60),
  auth_provider  text NOT NULL CHECK (auth_provider IN ('apple', 'google', 'email')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  last_seen_at   timestamptz
);

-- Aeropuertos reales. Se importan desde OurAirports (ADR-011); ninguna fila se
-- escribe a mano. La geometría se guarda una sola vez, en `location`: la
-- latitud y la longitud se derivan al leer, para que no puedan divergir.
CREATE TABLE airports (
  iata                       char(3) PRIMARY KEY CHECK (iata ~ '^[A-Z]{3}$'),
  icao                       char(4) NOT NULL CHECK (icao ~ '^[A-Z0-9]{4}$'),
  name                       text NOT NULL,
  city                       text NOT NULL,
  country                    char(2) NOT NULL CHECK (country ~ '^[A-Z]{2}$'),
  location                   geography(Point, 4326) NOT NULL,
  elevation_ft               integer NOT NULL,
  timezone                   text NOT NULL,
  utc_offset_minutes         smallint NOT NULL,
  schengen                   boolean NOT NULL,

  runway_count               smallint NOT NULL CHECK (runway_count > 0),
  longest_runway_ft          integer NOT NULL CHECK (longest_runway_ft > 0),
  size_class                 smallint NOT NULL CHECK (size_class BETWEEN 1 AND 5),

  landing_fee_cents_per_tonne integer NOT NULL CHECK (landing_fee_cents_per_tonne >= 0),
  pax_fee_cents              integer NOT NULL CHECK (pax_fee_cents >= 0),
  handling_fee_cents         integer NOT NULL CHECK (handling_fee_cents >= 0),

  -- Provisional: pendiente C-1 en docs/decisions.md.
  market_weight              numeric(10,2) NOT NULL CHECK (market_weight > 0),
  business_index             numeric(4,3) NOT NULL CHECK (business_index BETWEEN 0 AND 1),
  leisure_index              numeric(4,3) NOT NULL CHECK (leisure_index BETWEEN 0 AND 1),
  seasonality                jsonb NOT NULL CHECK (jsonb_array_length(seasonality) = 12),

  source                     text NOT NULL,
  imported_at                timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX airports_location_idx ON airports USING GIST (location);
CREATE INDEX airports_country_size_idx ON airports (country, size_class);

-- Catálogo de tipos de avión. Designaciones ficticias por decisión de producto
-- (ADR-002); los parámetros sí son realistas porque mueven la economía.
CREATE TABLE aircraft_types (
  code                    text PRIMARY KEY CHECK (code ~ '^[A-Z]{2,4}[0-9]{1,4}$'),
  name                    text NOT NULL,
  category                text NOT NULL CHECK (category IN ('regional', 'narrowbody', 'widebody')),
  family                  text NOT NULL,

  max_seats               smallint NOT NULL CHECK (max_seats > 0),
  typical_seats           smallint NOT NULL CHECK (typical_seats > 0 AND typical_seats <= max_seats),
  range_km                integer NOT NULL CHECK (range_km > 0),
  cruise_speed_kmh        smallint NOT NULL CHECK (cruise_speed_kmh > 0),
  mtow_kg                 integer NOT NULL CHECK (mtow_kg > 0),
  min_runway_ft           integer NOT NULL CHECK (min_runway_ft > 0),

  fuel_burn_kg_per_hour   numeric(8,1) NOT NULL CHECK (fuel_burn_kg_per_hour > 0),
  crew_cockpit            smallint NOT NULL CHECK (crew_cockpit > 0),
  cabin_crew_per_50_seats numeric(3,1) NOT NULL CHECK (cabin_crew_per_50_seats > 0),

  price_cents             bigint NOT NULL CHECK (price_cents > 0),
  lease_rate_month_cents  bigint NOT NULL CHECK (lease_rate_month_cents > 0),
  maint_cost_hour_cents   bigint NOT NULL CHECK (maint_cost_hour_cents > 0),
  base_reliability        numeric(4,3) NOT NULL CHECK (base_reliability BETWEEN 0 AND 1),
  turnaround_minutes      smallint NOT NULL CHECK (turnaround_minutes > 0)
);

CREATE TABLE airlines (
  id             uuid PRIMARY KEY,
  world_id       uuid NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
  account_id     uuid REFERENCES accounts(id) ON DELETE SET NULL,

  name           text NOT NULL CHECK (length(name) BETWEEN 2 AND 60),
  iata_code      char(2) NOT NULL CHECK (iata_code ~ '^[A-Z0-9]{2}$'),
  icao_code      char(3) NOT NULL CHECK (icao_code ~ '^[A-Z]{3}$'),
  country        char(2) NOT NULL CHECK (country ~ '^[A-Z]{2}$'),
  hub            char(3) NOT NULL REFERENCES airports(iata),
  business_model text NOT NULL CHECK (business_model IN ('lowcost', 'fullservice', 'regional', 'charter')),

  -- Quién decide. No altera ninguna regla económica (ADR-003).
  controller     text NOT NULL CHECK (controller IN ('player', 'npc')),
  npc_strategy   text CHECK (npc_strategy IN ('lowcost', 'premium', 'regional', 'hub_and_spoke',
                                              'point_to_point', 'conservative', 'aggressive')),

  -- Saldo materializado por rendimiento. La verdad es SUM(ledger_entries) (ADR-007).
  cash_cents     bigint NOT NULL,
  reputation     numeric(5,2) NOT NULL DEFAULT 50 CHECK (reputation BETWEEN 0 AND 100),
  on_time_rate   numeric(5,2) NOT NULL DEFAULT 100 CHECK (on_time_rate BETWEEN 0 AND 100),
  founded_at     timestamptz NOT NULL,
  is_active      boolean NOT NULL DEFAULT true,

  CONSTRAINT airlines_controller_strategy_chk CHECK (
    (controller = 'npc' AND npc_strategy IS NOT NULL) OR
    (controller = 'player' AND npc_strategy IS NULL)
  ),
  CONSTRAINT airlines_player_has_account_chk CHECK (
    controller = 'npc' OR account_id IS NOT NULL
  ),
  UNIQUE (world_id, iata_code),
  UNIQUE (world_id, icao_code)
);

-- Una aerolínea por cuenta y mundo (ADR-012). Las NPC no tienen cuenta, así que
-- el índice es parcial: pueden existir muchas con account_id NULL.
CREATE UNIQUE INDEX airlines_one_per_account_idx
  ON airlines (world_id, account_id) WHERE account_id IS NOT NULL;

CREATE INDEX airlines_world_active_idx ON airlines (world_id, is_active);
CREATE INDEX airlines_hub_idx ON airlines (world_id, hub);
