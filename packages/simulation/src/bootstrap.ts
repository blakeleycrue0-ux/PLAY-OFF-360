import { DEFAULT_BALANCE, validateBalance, type BalanceConfig } from '@airline/config';
import type { Clock } from '@airline/shared';
import { aircraftTypesRepo, airportsRepo, type Pool } from '@airline/db';
import { silentLogger, type EngineContext, type EngineLogger } from './engine/context.js';

export interface CreateContextOptions {
  readonly pool: Pool;
  readonly clock: Clock;
  readonly config?: BalanceConfig;
  readonly logger?: EngineLogger;
}

/**
 * Prepara el contexto del motor cargando el mundo estático en memoria.
 *
 * Aeropuertos y tipos de avión no cambian durante la ejecución, así que se
 * cargan una vez: consultarlos por vuelo multiplicaría por cinco las consultas
 * del sistema sin aportar nada.
 */
export async function createEngineContext(options: CreateContextOptions): Promise<EngineContext> {
  const config = validateBalance(options.config ?? DEFAULT_BALANCE);

  const airports = await airportsRepo.listAirports(options.pool, { limit: 5_000 });
  const aircraftTypes = await aircraftTypesRepo.loadAircraftTypeCatalog(options.pool);

  if (airports.length === 0) {
    throw new Error('No hay aeropuertos cargados. Ejecuta `pnpm db:seed` antes de simular.');
  }

  return {
    pool: options.pool,
    config,
    clock: options.clock,
    airports: new Map(airports.map((a) => [a.iata, a])),
    aircraftTypes,
    logger: options.logger ?? silentLogger,
  };
}
