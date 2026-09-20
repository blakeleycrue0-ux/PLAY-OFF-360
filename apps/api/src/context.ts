import { systemClock, type Clock } from '@airline/shared';
import { createPool, databaseConfigFromEnv, type Pool } from '@airline/db';
import { DEFAULT_BALANCE, validateBalance, type BalanceConfig } from '@airline/config';

export interface ApiContext {
  readonly pool: Pool;
  readonly clock: Clock;
  readonly config: BalanceConfig;
}

export function createApiContext(overrides: Partial<ApiContext> = {}): ApiContext {
  return {
    pool: overrides.pool ?? createPool(databaseConfigFromEnv(process.env, 'airline-api')),
    clock: overrides.clock ?? systemClock,
    config: validateBalance(overrides.config ?? DEFAULT_BALANCE),
  };
}
