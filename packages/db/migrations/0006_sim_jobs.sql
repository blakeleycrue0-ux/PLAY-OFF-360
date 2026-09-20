-- Cola de trabajos programados.
--
-- Vive en la misma base que el estado del mundo a propósito (ADR-009): el vuelo
-- y su trabajo de resolución se insertan en la misma transacción, de modo que
-- es imposible que exista un vuelo sin resolución pendiente.

CREATE TABLE sim_jobs (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  world_id     uuid NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
  kind         text NOT NULL CHECK (kind IN (
                 'flight_departure',
                 'flight_arrival',
                 'schedule_materialize',
                 'daily_close'
               )),
  -- Momento en el que el trabajo debe ejecutarse. Los manejadores calculan el
  -- resultado a partir de este instante, nunca del reloj de pared: por eso un
  -- worker que arranca con retraso produce el mismo resultado (ADR-009).
  run_at       timestamptz NOT NULL,
  payload      jsonb NOT NULL DEFAULT '{}'::jsonb,

  status       text NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'running', 'done', 'failed')),
  attempts     smallint NOT NULL DEFAULT 0,
  locked_until timestamptz,
  last_error   text,
  -- Impide programar dos veces el mismo trabajo.
  dedupe_key   text NOT NULL UNIQUE,

  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

-- El índice que usa el worker para reclamar trabajo vencido. Parcial sobre los
-- pendientes: la cola crece con el histórico pero la consulta no se entera.
CREATE INDEX sim_jobs_due_idx ON sim_jobs (run_at) WHERE status = 'pending';
CREATE INDEX sim_jobs_stuck_idx ON sim_jobs (locked_until) WHERE status = 'running';
CREATE INDEX sim_jobs_world_kind_idx ON sim_jobs (world_id, kind, status);
