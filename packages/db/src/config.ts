/**
 * Configuración de conexión.
 *
 * Es el único punto del paquete que lee el entorno, de modo que los tests y el
 * arnés pueden construir la configuración a mano sin variables de entorno.
 */
export interface DatabaseConfig {
  readonly connectionString: string;
  readonly maxConnections: number;
  readonly statementTimeoutMs: number;
  readonly applicationName: string;
}

const DEFAULT_URL = 'postgres://localhost:5432/airline_dev';

export function databaseConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
  applicationName = 'airline',
): DatabaseConfig {
  return {
    connectionString: env['DATABASE_URL'] ?? DEFAULT_URL,
    maxConnections: Number(env['DATABASE_POOL_MAX'] ?? 10),
    statementTimeoutMs: Number(env['DATABASE_STATEMENT_TIMEOUT_MS'] ?? 30_000),
    applicationName,
  };
}
