import { InvariantError } from '@airline/shared';
import pg from 'pg';
import type { DatabaseConfig } from './config.js';

const { Pool, types } = pg;

const OID_INT8 = 20;
const OID_NUMERIC = 1700;

/**
 * El driver devuelve `bigint` y `numeric` como cadenas para no perder
 * precisión. Aquí sí se pueden convertir a número con seguridad porque el
 * dinero se guarda en céntimos enteros (ADR-006) y ningún importe del juego se
 * acerca al límite de entero seguro de JavaScript. La conversión se valida:
 * si algún día se acercara, el sistema falla ruidosamente en vez de redondear
 * en silencio.
 */
types.setTypeParser(OID_INT8, (value: string) => {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new InvariantError(`bigint fuera del rango entero seguro de JavaScript: ${value}`);
  }
  return parsed;
});

types.setTypeParser(OID_NUMERIC, (value: string) => Number.parseFloat(value));

export type Pool = pg.Pool;
export type PoolClient = pg.PoolClient;

/**
 * Cualquier cosa contra la que se pueda consultar: el pool o un cliente dentro
 * de una transacción. Los repositorios reciben esto, nunca un `Pool` concreto,
 * para poder componerse dentro de una transacción sin duplicar código.
 */
export interface Queryable {
  query<R extends pg.QueryResultRow = pg.QueryResultRow>(
    queryText: string,
    values?: readonly unknown[],
  ): Promise<pg.QueryResult<R>>;
}

export function createPool(config: DatabaseConfig): Pool {
  return new Pool({
    connectionString: config.connectionString,
    max: config.maxConnections,
    statement_timeout: config.statementTimeoutMs,
    application_name: config.applicationName,
  });
}

/**
 * Ejecuta una función dentro de una transacción.
 *
 * Toda liquidación de vuelo ocurre aquí dentro: pasajeros, asientos contables,
 * estado del avión y estado del vuelo se escriben juntos o no se escribe nada.
 * No existe "medio aterrizaje".
 */
export async function withTransaction<T>(
  pool: Pool,
  fn: (tx: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // Si el ROLLBACK falla la conexión está rota; se descarta al liberarla.
    }
    throw error;
  } finally {
    client.release();
  }
}

/** Devuelve la única fila esperada, o falla si no hay exactamente una. */
export function exactlyOne<T>(rows: readonly T[], what: string): T {
  const [first] = rows;
  if (rows.length !== 1 || first === undefined) {
    throw new InvariantError(
      `Se esperaba exactamente una fila de ${what}, se obtuvieron ${rows.length}`,
    );
  }
  return first;
}
