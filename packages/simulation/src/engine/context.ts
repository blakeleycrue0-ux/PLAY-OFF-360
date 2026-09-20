import type { BalanceConfig } from '@airline/config';
import type { AircraftType, Airport } from '@airline/domain';
import type { Clock } from '@airline/shared';
import type { Pool } from '@airline/db';

/**
 * Todo lo que un manejador necesita para trabajar.
 *
 * El reloj se inyecta: el worker de producción recibe uno de sistema y el arnés
 * uno virtual que salta al siguiente trabajo pendiente. Es lo que permite que
 * el mismo motor sirva para producción y para simular meses en segundos
 * (ADR-010).
 *
 * Los catálogos —aeropuertos y tipos de avión— se cargan una vez y se pasan en
 * memoria: son el mundo estático, no cambian durante la ejecución, y
 * consultarlos por vuelo multiplicaría por cinco las consultas del sistema.
 */
export interface EngineContext {
  readonly pool: Pool;
  readonly config: BalanceConfig;
  readonly clock: Clock;
  readonly airports: ReadonlyMap<string, Airport>;
  readonly aircraftTypes: ReadonlyMap<string, AircraftType>;
  readonly logger: EngineLogger;
}

export interface EngineLogger {
  debug(message: string, data?: Readonly<Record<string, unknown>>): void;
  info(message: string, data?: Readonly<Record<string, unknown>>): void;
  warn(message: string, data?: Readonly<Record<string, unknown>>): void;
  error(message: string, data?: Readonly<Record<string, unknown>>): void;
}

export const silentLogger: EngineLogger = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

export function requireAirport(ctx: EngineContext, iata: string): Airport {
  const airport = ctx.airports.get(iata);
  if (airport === undefined) throw new Error(`Aeropuerto no cargado en el catálogo: ${iata}`);
  return airport;
}

export function requireAircraftType(ctx: EngineContext, code: string): AircraftType {
  const type = ctx.aircraftTypes.get(code);
  if (type === undefined) throw new Error(`Tipo de avión no cargado en el catálogo: ${code}`);
  return type;
}
