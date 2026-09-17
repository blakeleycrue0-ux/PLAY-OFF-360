# 02 — Modelo de datos

Postgres. Todo el esquema en migraciones versionadas (`packages/db`). Lo que
sigue es el diseño; los tipos exactos se afinan al implementar.

## 2.1 Las tres categorías de datos

Distinguirlas evita el error clásico de tratarlo todo igual:

| Categoría | Qué es | Volumen | Escritura |
|---|---|---|---|
| **Mundo estático** | aeropuertos, tipos de avión, países, mercados | miles de filas | casi nunca (lo carga un seed) |
| **Estado del jugador** | aerolínea, flota, rutas, personal, dinero | decenas por jugador | frecuente pero pequeña |
| **Flujo del mundo** | vuelos, asientos contables, eventos, noticias | **millones al día** | masiva e inmutable |

La tercera categoría es la que decide si la base de datos aguanta. Se diseña
como **append-only + particionada por fecha + archivada por agregados**.

## 2.2 Mundo estático

### `airports`

Datos reales. Fuente: [OurAirports](https://ourairports.com/data/) (dominio
público, ~80.000 aeropuertos; se filtran a los ~4.000 con tráfico comercial).

```sql
CREATE TABLE airports (
  iata            char(3) PRIMARY KEY,          -- PMI, LGW, BCN
  icao            char(4) UNIQUE,               -- LEPA, EGKK
  name            text NOT NULL,
  city            text NOT NULL,
  country         char(2) NOT NULL REFERENCES countries(code),
  location        geography(Point, 4326) NOT NULL,
  elevation_ft    int NOT NULL,
  timezone        text NOT NULL,                -- IANA: Europe/Madrid

  -- infraestructura (determina qué aviones pueden operar)
  runway_count    smallint NOT NULL,
  longest_runway_ft int NOT NULL,
  terminals       smallint NOT NULL DEFAULT 1,
  gates           smallint NOT NULL,

  -- capacidad: el recurso escaso del juego
  slots_per_hour  smallint NOT NULL,            -- movimientos/hora
  curfew_start    time,                         -- restricción nocturna
  curfew_end      time,

  -- economía
  size_class      smallint NOT NULL,            -- 1 regional … 5 gran hub
  landing_fee_base numeric(10,2) NOT NULL,      -- €/tonelada MTOW
  pax_fee         numeric(8,2) NOT NULL,        -- €/pasajero
  handling_fee    numeric(10,2) NOT NULL,
  slot_price_base numeric(12,2) NOT NULL,

  -- mercado (alimenta el modelo de demanda, ver doc 04)
  market_weight   numeric(10,2) NOT NULL,       -- tamaño del catchment
  business_index  numeric(4,3) NOT NULL,        -- 0..1
  leisure_index   numeric(4,3) NOT NULL,        -- 0..1 (PMI muy alto)
  seasonality     jsonb NOT NULL                -- multiplicador por mes
);
CREATE INDEX ON airports USING GIST (location);
CREATE INDEX ON airports (country, size_class);
```

> Nota práctica: los grandes hubs (LHR, CDG) tendrán `slots_per_hour` bajo en
> relación a la demanda, `slot_price_base` alto y `landing_fee_base` alto. Ahí
> nace la tensión de "los aeropuertos grandes son más difíciles y caros".

### `aircraft_types`

```sql
CREATE TABLE aircraft_types (
  code              text PRIMARY KEY,       -- A20N, B38M, AT76, E195
  manufacturer      text NOT NULL,
  family            text NOT NULL,          -- para type ratings compartidos
  category          text NOT NULL,          -- regional | narrowbody | widebody | cargo

  max_seats         smallint NOT NULL,      -- en configuración de alta densidad
  typical_seats     smallint NOT NULL,
  cargo_capacity_kg int NOT NULL,
  range_km          int NOT NULL,
  cruise_speed_kmh  smallint NOT NULL,
  mtow_kg           int NOT NULL,
  min_runway_ft     int NOT NULL,

  fuel_burn_kg_hour numeric(8,1) NOT NULL,
  crew_cockpit      smallint NOT NULL,      -- 2
  crew_cabin_per_50 numeric(3,1) NOT NULL,  -- normativa: 1 por cada 50 asientos

  price_new         numeric(14,2) NOT NULL,
  lease_rate_month  numeric(12,2) NOT NULL,
  maint_cost_hour   numeric(10,2) NOT NULL,
  base_reliability  numeric(4,3) NOT NULL,  -- 0.94 … 0.995
  turnaround_min    smallint NOT NULL,      -- 25 regional … 90 widebody

  production_start  smallint,               -- año: define disponibilidad
  production_end    smallint
);
```

> **Nota legal** (importante, y el repositorio ya tiene historia con esto): los
> nombres comerciales de fabricantes y modelos son marcas registradas. Recomiendo
> designaciones tipo *"AX-320neo / clase narrowbody moderno"* con siluetas
> propias, o cerrar el tema explícitamente antes de lanzar. Los códigos y datos
> de **aeropuertos** sí son hechos y no plantean el mismo problema.

## 2.3 Cuentas, mundos y aerolíneas

```sql
CREATE TABLE accounts (
  id            uuid PRIMARY KEY,
  email         citext UNIQUE,
  auth_provider text NOT NULL,        -- apple | google | email
  display_name  text NOT NULL,
  created_at    timestamptz NOT NULL,
  last_seen_at  timestamptz,
  push_tokens   jsonb NOT NULL DEFAULT '[]'
);

-- Un "mundo" es un shard: universo compartido e independiente.
CREATE TABLE worlds (
  id              uuid PRIMARY KEY,
  name            text NOT NULL,          -- "Europa 1", "Global Beta"
  seed            bigint NOT NULL,        -- determinismo
  time_scale      numeric(4,2) NOT NULL DEFAULT 1.0,
  started_at      timestamptz NOT NULL,
  season          smallint NOT NULL DEFAULT 1,
  config_version  text NOT NULL,          -- parámetros de balance aplicados
  status          text NOT NULL           -- open | full | archived
);

CREATE TABLE airlines (
  id              uuid PRIMARY KEY,
  world_id        uuid NOT NULL REFERENCES worlds(id),
  account_id      uuid NOT NULL REFERENCES accounts(id),

  name            text NOT NULL,
  iata_code       char(2) NOT NULL,       -- BL
  icao_code       char(3) NOT NULL,       -- BLA  → callsign BLA204
  country         char(2) NOT NULL,
  hub_iata        char(3) NOT NULL REFERENCES airports(iata),
  business_model  text NOT NULL,          -- lowcost | fullservice | regional | charter | cargo

  -- identidad visual
  logo            jsonb NOT NULL,         -- generador propio: forma+color+símbolo
  livery          jsonb NOT NULL,         -- esquema base + acentos
  colors          jsonb NOT NULL,

  -- estado económico (saldo materializado; la verdad está en el ledger)
  cash            numeric(16,2) NOT NULL,
  credit_rating   text NOT NULL DEFAULT 'BBB',
  debt            numeric(16,2) NOT NULL DEFAULT 0,

  -- reputación y progresión
  reputation      numeric(5,2) NOT NULL DEFAULT 50,   -- 0..100
  on_time_rate    numeric(5,2) NOT NULL DEFAULT 100,
  safety_rating   numeric(5,2) NOT NULL DEFAULT 100,
  tier            smallint NOT NULL DEFAULT 1,        -- fase de progresión

  founded_at      timestamptz NOT NULL,
  is_active       boolean NOT NULL DEFAULT true,

  UNIQUE (world_id, iata_code),
  UNIQUE (world_id, icao_code),
  UNIQUE (world_id, account_id)      -- una aerolínea por jugador y mundo
);
```

## 2.4 Flota

```sql
CREATE TABLE aircraft (
  id              uuid PRIMARY KEY,
  world_id        uuid NOT NULL,
  airline_id      uuid NOT NULL REFERENCES airlines(id),
  type_code       text NOT NULL REFERENCES aircraft_types(code),
  registration    text NOT NULL,          -- EC-BLA (generado por país)
  name            text,                   -- los jugadores bautizan aviones

  ownership       text NOT NULL,          -- owned | leased
  lease_end       timestamptz,
  lease_rate      numeric(12,2),
  purchase_price  numeric(14,2),
  book_value      numeric(14,2),          -- depreciación lineal a 25 años

  -- configuración de cabina (suma ≤ max_seats con pesos por clase)
  config          jsonb NOT NULL,         -- {"economy":180,"premium":0,"business":0}
  livery_id       uuid REFERENCES liveries(id),

  -- desgaste
  built_year      smallint NOT NULL,
  flight_hours    numeric(10,1) NOT NULL DEFAULT 0,
  cycles          int NOT NULL DEFAULT 0,        -- despegue+aterrizaje
  condition       numeric(5,2) NOT NULL DEFAULT 100,   -- 0..100
  next_check_type text NOT NULL DEFAULT 'A',
  next_check_hours numeric(10,1) NOT NULL,

  -- estado operativo
  status          text NOT NULL,          -- idle | scheduled | in_flight | maintenance | aog | grounded | for_sale
  current_airport char(3) REFERENCES airports(iata),
  available_at    timestamptz NOT NULL    -- clave: cuándo vuelve a estar libre
);
CREATE INDEX ON aircraft (airline_id, status);
CREATE INDEX ON aircraft (world_id, current_airport, available_at);
```

`available_at` es una columna aparentemente humilde y en realidad fundamental:
es lo que permite validar en O(1) si un avión puede aceptar un vuelo más, sin
recorrer su programación entera. Incluye el *turnaround*.

## 2.5 Red: rutas y vuelos

```sql
CREATE TABLE routes (
  id              uuid PRIMARY KEY,
  world_id        uuid NOT NULL,
  airline_id      uuid NOT NULL REFERENCES airlines(id),
  origin          char(3) NOT NULL REFERENCES airports(iata),
  destination     char(3) NOT NULL REFERENCES airports(iata),
  distance_km     int NOT NULL,

  -- decisiones comerciales del jugador
  prices          jsonb NOT NULL,         -- {"economy":89.90,"business":249}
  service_level   smallint NOT NULL DEFAULT 2,   -- catering, equipaje, etc.
  status          text NOT NULL,          -- active | suspended | closed

  opened_at       timestamptz NOT NULL,
  UNIQUE (airline_id, origin, destination)
);

-- Plantilla de programación: "L-X-V a las 18:20 con este avión".
CREATE TABLE schedules (
  id              uuid PRIMARY KEY,
  route_id        uuid NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  aircraft_id     uuid NOT NULL REFERENCES aircraft(id),
  days_of_week    smallint NOT NULL,      -- bitmask 1111111
  departure_local time NOT NULL,
  flight_number   text NOT NULL,          -- BLA204
  slot_id         uuid REFERENCES slots(id),
  valid_from      date NOT NULL,
  valid_to        date,
  is_active       boolean NOT NULL DEFAULT true
);
```

### `flights` — la tabla caliente

Una fila por vuelo real. **Particionada por día.** Es el núcleo del mundo vivo.

```sql
CREATE TABLE flights (
  id              uuid NOT NULL,
  world_id        uuid NOT NULL,
  airline_id      uuid NOT NULL,
  route_id        uuid NOT NULL,
  aircraft_id     uuid NOT NULL,
  schedule_id     uuid,
  flight_number   text NOT NULL,

  origin          char(3) NOT NULL,
  destination     char(3) NOT NULL,

  -- el plan (se escribe al programar)
  scheduled_departure timestamptz NOT NULL,
  scheduled_arrival   timestamptz NOT NULL,
  seats_offered   jsonb NOT NULL,
  prices          jsonb NOT NULL,

  -- la realidad (se escribe al despegar y al aterrizar)
  actual_departure timestamptz,
  actual_arrival   timestamptz,
  status          text NOT NULL,   -- scheduled|boarding|departed|en_route|landed|delayed|diverted|cancelled
  delay_minutes   smallint NOT NULL DEFAULT 0,
  diverted_to     char(3),

  -- resultado (se escribe una sola vez, al resolver)
  pax             jsonb,           -- {"economy":168,"business":9}
  load_factor     numeric(5,2),
  cargo_kg        int,
  revenue         numeric(12,2),
  cost            numeric(12,2),
  profit          numeric(12,2),
  fuel_kg         numeric(10,1),
  incident_id     uuid,

  resolved_at     timestamptz,
  PRIMARY KEY (id, scheduled_departure)
) PARTITION BY RANGE (scheduled_departure);

-- Índice que sostiene el mapa en vivo:
CREATE INDEX ON flights (world_id, status, scheduled_departure)
  WHERE status IN ('departed','en_route','delayed');
```

La posición del avión **no está en esta tabla**. Se deriva de
`origin`, `destination`, `actual_departure` y `scheduled_arrival`. Ver doc 03.

## 2.6 Slots: el recurso escaso compartido

```sql
CREATE TABLE slots (
  id              uuid PRIMARY KEY,
  world_id        uuid NOT NULL,
  airport         char(3) NOT NULL REFERENCES airports(iata),
  slot_time       time NOT NULL,          -- inicio de la franja
  slot_kind       text NOT NULL,          -- departure | arrival
  season          smallint NOT NULL,
  airline_id      uuid REFERENCES airlines(id),   -- NULL = libre
  acquired_at     timestamptz,
  annual_fee      numeric(12,2) NOT NULL,
  use_rate_90d    numeric(5,2),           -- regla "úsalo o piérdelo"
  UNIQUE (world_id, airport, slot_time, slot_kind, season)
);
CREATE INDEX ON slots (world_id, airport, airline_id);
```

Los slots se pre-generan por aeropuerto a partir de `slots_per_hour` y las
franjas horarias. En aeropuertos pequeños sobran; en LHR a las 08:00 hay
competencia real entre jugadores, con subasta y con la regla de uso mínimo
del 80% para no permitir acaparamiento especulativo.

## 2.7 Personal

Agregado por base y categoría, no persona a persona (microgestionar 4.000
tripulantes no es divertido, y tampoco escala).

```sql
CREATE TABLE staff_pools (
  id              uuid PRIMARY KEY,
  airline_id      uuid NOT NULL REFERENCES airlines(id),
  base_airport    char(3) NOT NULL,
  role            text NOT NULL,      -- pilot | cabin | mechanic | ground | manager
  type_rating     text,               -- familia de avión (solo pilotos/mecánicos)
  headcount       int NOT NULL,
  avg_salary      numeric(10,2) NOT NULL,
  skill           numeric(4,2) NOT NULL DEFAULT 50,   -- 0..100
  morale          numeric(4,2) NOT NULL DEFAULT 70,
  training_queue  jsonb NOT NULL DEFAULT '[]'
);
```

Cada vuelo consume una fracción de la capacidad del pool de su base. Si no
alcanza → retrasos, cancelaciones y caída de moral. El sueldo por encima del
mercado sube moral y habilidad; por debajo, provoca rotación y hasta huelgas
(evento). Ver doc 06.

## 2.8 Contabilidad: el ledger append-only

**Nunca** se hace `UPDATE airlines SET cash = cash - 50000`. Todo movimiento de
dinero es una fila inmutable:

```sql
CREATE TABLE ledger_entries (
  id              bigserial,
  world_id        uuid NOT NULL,
  airline_id      uuid NOT NULL,
  occurred_at     timestamptz NOT NULL,
  category        text NOT NULL,   -- ticket_revenue | cargo | ancillary | fuel |
                                   -- lease | maintenance | salary | airport_fee |
                                   -- slot_fee | handling | aircraft_purchase |
                                   -- aircraft_sale | compensation | insurance | overhead
  amount          numeric(14,2) NOT NULL,   -- + ingreso, − gasto
  flight_id       uuid,
  aircraft_id     uuid,
  route_id        uuid,
  description     text,
  idempotency_key text NOT NULL,
  PRIMARY KEY (id, occurred_at),
  UNIQUE (world_id, idempotency_key)
) PARTITION BY RANGE (occurred_at);
```

Dos propiedades que valen su peso en oro:

1. **`idempotency_key` con `UNIQUE`** (`flight:{uuid}:settlement`, 
   `lease:{uuid}:2026-04`). Si un job se reintenta tras un fallo de red, el
   segundo intento choca con la restricción y no duplica dinero. En un juego
   económico multijugador, el dinero duplicado es el fin de la partida.
2. **P&L por cualquier eje sin trabajo extra**: por ruta, por avión, por mes,
   por categoría. Es exactamente lo que el jugador necesita para descubrir que
   su ruta estrella pierde dinero.

`airlines.cash` es una **vista materializada del ledger**, reconciliada en cada
cierre diario. Si diverge, hay un bug y salta una alerta.

## 2.9 Eventos y noticias

```sql
CREATE TABLE world_events (
  id            uuid PRIMARY KEY,
  world_id      uuid NOT NULL,
  kind          text NOT NULL,      -- storm | strike | airspace_closure | fuel_shock |
                                    -- demand_surge | volcanic_ash | security_alert
  severity      smallint NOT NULL,  -- 1..5
  scope         jsonb NOT NULL,     -- {"airports":[...]} | {"countries":["ES"]} | {"global":true}
  starts_at     timestamptz NOT NULL,
  ends_at       timestamptz NOT NULL,
  effects       jsonb NOT NULL,     -- multiplicadores aplicados por el motor
  seed          bigint NOT NULL
);

CREATE TABLE incidents (
  id            uuid PRIMARY KEY,
  world_id      uuid NOT NULL,
  airline_id    uuid NOT NULL,
  flight_id     uuid,
  aircraft_id   uuid,
  kind          text NOT NULL,      -- technical | weather | bird_strike | diversion |
                                    -- emergency_landing | ground_damage | accident
  severity      text NOT NULL,      -- minor | major | serious | accident
  occurred_at   timestamptz NOT NULL,
  cause_factors jsonb NOT NULL,     -- ★ trazabilidad: por qué pasó
  consequences  jsonb NOT NULL,     -- {"aircraft_status":"aog","repair_days":14,...}
  investigation_ends_at timestamptz,
  seed          bigint NOT NULL
);

CREATE TABLE news_items (
  id            uuid PRIMARY KEY,
  world_id      uuid NOT NULL,
  published_at  timestamptz NOT NULL,
  scope         text NOT NULL,      -- global | regional | airline
  headline      text NOT NULL,
  body          text NOT NULL,
  importance    smallint NOT NULL,  -- 1..5 (5 = breaking)
  source_event  uuid,
  source_incident uuid,
  airline_ids   uuid[],
  airport_codes char(3)[]
);
```

`cause_factors` es deliberadamente explícito (`{"condition":41,"deferred_checks":3,
"weather_severity":4,"crew_fatigue":0.7}`). Permite dos cosas: explicarle al
jugador **por qué** le ha pasado (un juego que castiga sin explicar es un juego
injusto) y auditar el balance del sistema de riesgo.

## 2.10 Social

```sql
CREATE TABLE alliances (
  id        uuid PRIMARY KEY,
  world_id  uuid NOT NULL,
  name      text NOT NULL,
  tag       text NOT NULL,
  logo      jsonb NOT NULL,
  founded_at timestamptz NOT NULL,
  max_members smallint NOT NULL DEFAULT 12
);

CREATE TABLE alliance_members (
  alliance_id uuid REFERENCES alliances(id),
  airline_id  uuid REFERENCES airlines(id) UNIQUE,
  role        text NOT NULL,     -- founder | admin | member
  joined_at   timestamptz NOT NULL,
  PRIMARY KEY (alliance_id, airline_id)
);

-- Codeshare: acuerdo bilateral que habilita itinerarios con conexión.
CREATE TABLE codeshare_agreements (
  id          uuid PRIMARY KEY,
  world_id    uuid NOT NULL,
  airline_a   uuid NOT NULL REFERENCES airlines(id),
  airline_b   uuid NOT NULL REFERENCES airlines(id),
  hub         char(3) NOT NULL,         -- dónde conectan
  revenue_split numeric(4,3) NOT NULL,  -- prorrateo por distancia
  status      text NOT NULL,            -- proposed | active | terminated
  proposed_at timestamptz NOT NULL
);
```

## 2.11 La cola de simulación

```sql
CREATE TABLE sim_jobs (
  id            bigserial PRIMARY KEY,
  world_id      uuid NOT NULL,
  kind          text NOT NULL,     -- flight_departure | flight_arrival | maintenance_complete |
                                   -- daily_close | monthly_close | demand_refresh |
                                   -- world_event_tick | lease_payment
  run_at        timestamptz NOT NULL,
  payload       jsonb NOT NULL,
  attempts      smallint NOT NULL DEFAULT 0,
  locked_until  timestamptz,
  status        text NOT NULL DEFAULT 'pending',   -- pending | done | failed
  dedupe_key    text UNIQUE
);
CREATE INDEX ON sim_jobs (status, run_at) WHERE status = 'pending';
```

## 2.12 Notas de escalado

| Tabla | Crecimiento estimado (1 mundo, 10k aerolíneas activas) | Estrategia |
|---|---|---|
| `flights` | ~1,5 M filas/día | partición diaria; agregado a `route_stats_daily` y borrado del detalle a los 30 días |
| `ledger_entries` | ~8 M filas/día | partición mensual; consolidación a `airline_pnl_monthly` al cerrar mes |
| `news_items` | miles/día | retención 90 días |
| `aircraft` / `routes` | decenas de miles | sin problema |

Las estadísticas visibles del jugador (pasajeros totales, beneficio del mes,
puntualidad) **nunca se calculan sobre el detalle en tiempo de consulta**: se
mantienen en tablas de agregados actualizadas en el cierre diario. Un perfil
público debe cargar en menos de 200 ms leyendo una sola fila.
