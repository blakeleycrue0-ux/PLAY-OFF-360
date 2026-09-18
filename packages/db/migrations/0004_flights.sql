-- Vuelos y su registro de acontecimientos.
--
-- `flights` es la tabla caliente del sistema: del orden de un millón y medio de
-- filas al día en un mundo lleno (docs/02 §2.12). Se particiona por mes sobre
-- la fecha de salida programada.
--
-- No hay latitud ni longitud: la posición de un avión es una función del plan y
-- del reloj, no un campo que alguien actualice (docs/03 §3.2).

CREATE TABLE flights (
  id                  uuid NOT NULL,
  world_id            uuid NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
  airline_id          uuid NOT NULL REFERENCES airlines(id) ON DELETE CASCADE,
  route_id            uuid NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  aircraft_id         uuid NOT NULL REFERENCES aircraft(id) ON DELETE CASCADE,
  schedule_id         uuid REFERENCES flight_schedules(id) ON DELETE SET NULL,
  flight_number       text NOT NULL,

  origin              char(3) NOT NULL REFERENCES airports(iata),
  destination         char(3) NOT NULL REFERENCES airports(iata),

  -- El plan, escrito al programar el vuelo.
  scheduled_departure timestamptz NOT NULL,
  scheduled_arrival   timestamptz NOT NULL,
  seats_offered       jsonb NOT NULL,
  prices              jsonb NOT NULL,

  -- La realidad, escrita al despegar.
  actual_departure    timestamptz,
  actual_arrival      timestamptz,
  status              text NOT NULL DEFAULT 'scheduled'
                        CHECK (status IN ('scheduled', 'departed', 'landed', 'cancelled')),
  delay_minutes       smallint NOT NULL DEFAULT 0 CHECK (delay_minutes >= 0),

  -- El resultado, escrito una sola vez al aterrizar.
  pax                 jsonb,
  load_factor         numeric(5,4) CHECK (load_factor BETWEEN 0 AND 1),
  revenue_cents       bigint,
  cost_cents          bigint,
  profit_cents        bigint,
  fuel_kg             numeric(10,1),
  resolved_at         timestamptz,

  created_at          timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (id, scheduled_departure),
  CONSTRAINT flights_arrival_after_departure_chk CHECK (scheduled_arrival > scheduled_departure),
  CONSTRAINT flights_distinct_airports_chk CHECK (origin <> destination),
  -- Un vuelo aterrizado está liquidado por completo, o no lo está en absoluto.
  CONSTRAINT flights_landed_is_settled_chk CHECK (
    status <> 'landed' OR (
      actual_departure IS NOT NULL AND actual_arrival IS NOT NULL AND
      pax IS NOT NULL AND revenue_cents IS NOT NULL AND
      cost_cents IS NOT NULL AND profit_cents IS NOT NULL AND resolved_at IS NOT NULL
    )
  ),
  CONSTRAINT flights_departed_has_departure_chk CHECK (
    status NOT IN ('departed', 'landed') OR actual_departure IS NOT NULL
  ),
  CONSTRAINT flights_profit_is_difference_chk CHECK (
    profit_cents IS NULL OR profit_cents = revenue_cents - cost_cents
  )
) PARTITION BY RANGE (scheduled_departure);

-- Índice que sostiene el mapa en vivo: qué hay volando ahora mismo.
CREATE INDEX flights_airborne_idx ON flights (world_id, status, scheduled_departure)
  WHERE status = 'departed';
CREATE INDEX flights_airline_idx ON flights (airline_id, scheduled_departure DESC);
CREATE INDEX flights_route_idx ON flights (route_id, scheduled_departure DESC);
CREATE INDEX flights_aircraft_idx ON flights (aircraft_id, scheduled_departure DESC);
-- Mercado del día: las ofertas competidoras de un par origen-destino.
CREATE INDEX flights_market_idx ON flights (world_id, origin, destination, scheduled_departure);
CREATE UNIQUE INDEX flights_schedule_slot_idx ON flights (schedule_id, scheduled_departure)
  WHERE schedule_id IS NOT NULL;

-- Registro de acontecimientos de un vuelo: su historia, append-only.
-- No es un log de texto; es la fuente desde la que se pueden reconstruir
-- estadísticas y, en fases posteriores, las noticias (docs/01 §1.6).
CREATE TABLE flight_events (
  id                         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  world_id                   uuid NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
  flight_id                  uuid NOT NULL,
  -- Se duplica la clave de partición para poder tener clave ajena real
  -- contra una tabla particionada (ADR-008).
  flight_scheduled_departure timestamptz NOT NULL,
  kind                       text NOT NULL CHECK (kind IN (
                               'flight.created',
                               'flight.departure.scheduled',
                               'flight.departed',
                               'flight.arrival.scheduled',
                               'flight.landed',
                               'flight.cancelled',
                               'flight.delayed'
                             )),
  occurred_at                timestamptz NOT NULL,
  payload                    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at                 timestamptz NOT NULL DEFAULT now(),

  FOREIGN KEY (flight_id, flight_scheduled_departure)
    REFERENCES flights (id, scheduled_departure) ON DELETE CASCADE
);

CREATE INDEX flight_events_flight_idx ON flight_events (flight_id, occurred_at);
CREATE INDEX flight_events_world_kind_idx ON flight_events (world_id, kind, occurred_at DESC);
