-- Gestión de particiones mensuales.
--
-- Las llaman las migraciones (para el rango inicial), el worker (para ir por
-- delante del calendario) y el arnés de simulación, que puede necesitar doce
-- meses de golpe antes de simular un año en segundos.

CREATE OR REPLACE FUNCTION sim_create_month_partition(p_table text, p_month date)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_start date := date_trunc('month', p_month)::date;
  v_end   date := (date_trunc('month', p_month) + interval '1 month')::date;
  v_name  text := format('%s_%s', p_table, to_char(v_start, 'YYYY_MM'));
BEGIN
  IF to_regclass(format('public.%I', v_name)) IS NOT NULL THEN
    RETURN false;
  END IF;

  EXECUTE format(
    'CREATE TABLE %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
    v_name, p_table, v_start, v_end
  );
  RETURN true;
END;
$$;

COMMENT ON FUNCTION sim_create_month_partition IS
  'Crea la partición mensual de una tabla particionada. Devuelve false si ya existía.';

CREATE OR REPLACE FUNCTION sim_ensure_partitions(p_from timestamptz, p_to timestamptz)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_month date := date_trunc('month', p_from)::date;
  v_last  date := date_trunc('month', p_to)::date;
  v_created integer := 0;
BEGIN
  IF p_to < p_from THEN
    RAISE EXCEPTION 'Rango de particiones invertido: % > %', p_from, p_to;
  END IF;

  WHILE v_month <= v_last LOOP
    IF sim_create_month_partition('flights', v_month) THEN v_created := v_created + 1; END IF;
    IF sim_create_month_partition('ledger_entries', v_month) THEN v_created := v_created + 1; END IF;
    v_month := (v_month + interval '1 month')::date;
  END LOOP;

  RETURN v_created;
END;
$$;

COMMENT ON FUNCTION sim_ensure_partitions IS
  'Garantiza que existen las particiones mensuales de flights y ledger_entries en el rango dado.';
