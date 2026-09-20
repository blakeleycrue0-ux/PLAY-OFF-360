import type { EngineLogger } from '@airline/simulation';

/** Registro estructurado en JSON por línea: legible por humanos y por máquinas. */
export function createLogger(level: 'debug' | 'info' | 'warn' | 'error' = 'info'): EngineLogger {
  const order = { debug: 10, info: 20, warn: 30, error: 40 };
  const threshold = order[level];

  const emit = (
    severity: keyof typeof order,
    message: string,
    data?: Readonly<Record<string, unknown>>,
  ): void => {
    if (order[severity] < threshold) return;
    const line = JSON.stringify({
      ts: new Date().toISOString(),
      level: severity,
      msg: message,
      ...(data ?? {}),
    });
    if (severity === 'error' || severity === 'warn') console.error(line);
    else console.log(line);
  };

  return {
    debug: (message, data) => {
      emit('debug', message, data);
    },
    info: (message, data) => {
      emit('info', message, data);
    },
    warn: (message, data) => {
      emit('warn', message, data);
    },
    error: (message, data) => {
      emit('error', message, data);
    },
  };
}
