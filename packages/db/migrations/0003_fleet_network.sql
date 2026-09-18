-- Flota y red comercial.

CREATE TABLE aircraft (
  id                  uuid PRIMARY KEY,
  world_id            uuid NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
  airline_id          uuid NOT NULL REFERENCES airlines(id) ON DELETE CASCADE,
  type_code           text NOT NULL REFERENCES aircraft_types(code),
  registration        text NOT NULL,

  ownership           text NOT NULL CHECK (ownership IN ('owned', 'leased')),
  lease_rate_cents    bigint CHECK (lease_rate_cents > 0),
  purchase_price_cents bigint CHECK (purchase_price_cents > 0),

  -- {"economy": 170, "business": 8}
  config              jsonb NOT NULL,

  built_year          smallint NOT NULL CHECK (built_year BETWEEN 1960 AND 2100),
  flight_hours        numeric(10,2) NOT NULL DEFAULT 0 CHECK (flight_hours >= 0),
  cycles              integer NOT NULL DEFAULT 0 CHECK (cycles >= 0),
  condition           numeric(5,2) NOT NULL DEFAULT 100 CHECK (condition BETWEEN 0 AND 100),
  next_check_type     text NOT NULL DEFAULT 'A' CHECK (next_check_type IN ('A', 'B', 'C', 'D')),
  next_check_at_hours numeric(10,2) NOT NULL CHECK (next_check_at_hours > 0),
  deferred_checks     smallint NOT NULL DEFAULT 0 CHECK (deferred_checks >= 0),

  status              text NOT NULL DEFAULT 'idle'
                        CHECK (status IN ('idle', 'scheduled', 'in_flight', 'maintenance', 'aog', 'grounded')),
  current_airport     char(3) NOT NULL REFERENCES airports(iata),
  -- Cuándo vuelve a estar libre, turnaround incluido. Permite validar en tiempo
  -- constante si admite un vuelo más (docs/02 §2.4).
  available_at        timestamptz NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT aircraft_registration_unique UNIQUE (world_id, registration),
  CONSTRAINT aircraft_ownership_terms_chk CHECK (
    (ownership = 'leased' AND lease_rate_cents IS NOT NULL) OR
    (ownership = 'owned' AND purchase_price_cents IS NOT NULL)
  ),
  CONSTRAINT aircraft_config_shape_chk CHECK (
    jsonb_typeof(config -> 'economy') = 'number' AND
    jsonb_typeof(config -> 'business') = 'number' AND
    (config ->> 'economy')::numeric >= 0 AND
    (config ->> 'business')::numeric >= 0
  )
);

CREATE INDEX aircraft_airline_status_idx ON aircraft (airline_id, status);
CREATE INDEX aircraft_availability_idx ON aircraft (world_id, current_airport, available_at);

CREATE TABLE routes (
  id            uuid PRIMARY KEY,
  world_id      uuid NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
  airline_id    uuid NOT NULL REFERENCES airlines(id) ON DELETE CASCADE,
  origin        char(3) NOT NULL REFERENCES airports(iata),
  destination   char(3) NOT NULL REFERENCES airports(iata),
  distance_km   integer NOT NULL CHECK (distance_km > 0),

  -- {"economy": 8990, "business": 24900} en céntimos
  prices        jsonb NOT NULL,
  service_level smallint NOT NULL DEFAULT 2 CHECK (service_level BETWEEN 0 AND 3),
  status        text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'closed')),
  opened_at     timestamptz NOT NULL,

  CONSTRAINT routes_distinct_airports_chk CHECK (origin <> destination),
  CONSTRAINT routes_unique_per_airline UNIQUE (airline_id, origin, destination),
  CONSTRAINT routes_prices_shape_chk CHECK (
    jsonb_typeof(prices -> 'economy') = 'number' AND jsonb_typeof(prices -> 'business') = 'number'
  )
);

-- Índice del mercado: dado un par origen-destino, quién lo opera. Es la consulta
-- que sostiene el reparto de demanda entre competidores.
CREATE INDEX routes_market_idx ON routes (world_id, origin, destination) WHERE status = 'active';
CREATE INDEX routes_airline_idx ON routes (airline_id, status);

-- Plantilla de programación: "L-X-V a las 18:20 con este avión" (docs/03 §3.1).
CREATE TABLE flight_schedules (
  id                   uuid PRIMARY KEY,
  world_id             uuid NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
  route_id             uuid NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  aircraft_id          uuid NOT NULL REFERENCES aircraft(id) ON DELETE CASCADE,
  -- Máscara de bits: bit 0 = domingo … bit 6 = sábado.
  days_of_week         smallint NOT NULL CHECK (days_of_week BETWEEN 1 AND 127),
  departure_minute_utc smallint NOT NULL CHECK (departure_minute_utc BETWEEN 0 AND 1439),
  flight_number        text NOT NULL CHECK (flight_number ~ '^[A-Z0-9]{2,3}[0-9]{1,4}$'),
  valid_from           timestamptz NOT NULL,
  valid_to             timestamptz,
  is_active            boolean NOT NULL DEFAULT true,
  -- Hasta dónde se han materializado ya los vuelos de esta plantilla. Evita
  -- generar dos veces los mismos y permite materializar sólo unos días por
  -- delante en vez de inundar la base con meses de vuelos.
  materialized_until   timestamptz NOT NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT flight_schedules_validity_chk CHECK (valid_to IS NULL OR valid_to > valid_from)
);

CREATE INDEX flight_schedules_pending_idx ON flight_schedules (world_id, materialized_until)
  WHERE is_active;
CREATE INDEX flight_schedules_route_idx ON flight_schedules (route_id) WHERE is_active;
