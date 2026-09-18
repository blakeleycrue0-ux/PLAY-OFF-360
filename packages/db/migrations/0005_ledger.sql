-- Contabilidad.
--
-- Regla innegociable (ADR-007): no existe `UPDATE airlines SET cash = cash - X`.
-- Todo movimiento de dinero es una fila inmutable con clave de idempotencia.

-- Guarda global de idempotencia.
--
-- `ledger_entries` está particionada por `occurred_at`, y PostgreSQL exige que
-- toda restricción única de una tabla particionada incluya la clave de
-- partición. Eso significa que un UNIQUE sobre la propia tabla sólo garantiza
-- unicidad *dentro de una partición*: un reintento que cayera en otro mes
-- duplicaría el dinero.
--
-- Esta tabla, sin particionar, es la autoridad: un asiento sólo se escribe si
-- su clave entra aquí primero, en la misma transacción. La idempotencia la da
-- una restricción de PostgreSQL, no una comprobación en JavaScript.
CREATE TABLE ledger_idempotency (
  world_id        uuid NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
  idempotency_key text NOT NULL,
  occurred_at     timestamptz NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (world_id, idempotency_key)
);

CREATE TABLE ledger_entries (
  id              bigint GENERATED ALWAYS AS IDENTITY,
  world_id        uuid NOT NULL,
  airline_id      uuid NOT NULL,
  occurred_at     timestamptz NOT NULL,
  category        text NOT NULL CHECK (category IN (
                    'ticket_revenue', 'ancillary_revenue',
                    'fuel', 'crew', 'maintenance', 'landing_fee', 'passenger_fee',
                    'handling', 'navigation', 'catering',
                    'lease', 'overhead', 'aircraft_purchase', 'aircraft_sale',
                    'founding_capital'
                  )),
  -- Entero de céntimos (ADR-006). Positivo ingreso, negativo gasto.
  amount_cents    bigint NOT NULL CHECK (amount_cents <> 0),

  -- Referencias blandas a propósito: el registro financiero debe sobrevivir al
  -- archivado del detalle de vuelos (ADR-008).
  flight_id       uuid,
  aircraft_id     uuid,
  route_id        uuid,

  description     text,
  idempotency_key text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (id, occurred_at),
  -- Segunda línea de defensa dentro de la partición. La garantía global la da
  -- `ledger_idempotency`.
  UNIQUE (world_id, idempotency_key, occurred_at)
) PARTITION BY RANGE (occurred_at);

CREATE INDEX ledger_airline_time_idx ON ledger_entries (airline_id, occurred_at DESC);
CREATE INDEX ledger_route_idx ON ledger_entries (route_id, occurred_at DESC) WHERE route_id IS NOT NULL;
CREATE INDEX ledger_aircraft_idx ON ledger_entries (aircraft_id, occurred_at DESC) WHERE aircraft_id IS NOT NULL;
CREATE INDEX ledger_flight_idx ON ledger_entries (flight_id) WHERE flight_id IS NOT NULL;
CREATE INDEX ledger_category_idx ON ledger_entries (airline_id, category, occurred_at DESC);
