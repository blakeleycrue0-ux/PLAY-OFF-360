import Fastify, { type FastifyInstance } from 'fastify';
import type { ApiContext } from './context.js';
import { registerMapRoutes } from './routes/map.js';
import { registerRouteAnalysisRoutes } from './routes/route-analysis.js';
import { registerWorldRoutes } from './routes/world.js';

/** Fastify adorna sus errores con `statusCode`; cualquier otro es un 500. */
function statusCodeOf(error: unknown): number {
  if (error !== null && typeof error === 'object' && 'statusCode' in error) {
    const { statusCode } = error;
    if (typeof statusCode === 'number' && statusCode >= 400 && statusCode < 600) return statusCode;
  }
  return 500;
}

/**
 * API mínima de la Fase 1.
 *
 * No es la API del producto: es la superficie justa para comprobar que el
 * dominio y la infraestructura funcionan de verdad —mundos, aerolíneas, mapa en
 * vivo y analizador de rutas—. Las mutaciones del jugador llegan en la fase
 * siguiente, con autenticación (ADR-012).
 */
export function buildApp(ctx: ApiContext): FastifyInstance {
  const app = Fastify({ logger: false });

  app.get('/health', async () => {
    const result = await ctx.pool.query<{ ok: number }>('SELECT 1 AS ok');
    return {
      status: result.rows[0]?.ok === 1 ? 'ok' : 'degraded',
      serverTime: new Date(ctx.clock.now()).toISOString(),
      balanceVersion: ctx.config.version,
    };
  });

  registerWorldRoutes(app, ctx);
  registerMapRoutes(app, ctx);
  registerRouteAnalysisRoutes(app, ctx);

  app.setErrorHandler((error: unknown, _request, reply) => {
    void reply.code(statusCodeOf(error)).send({
      error: error instanceof Error ? error.name : 'InternalError',
      message: error instanceof Error ? error.message : 'Error inesperado',
    });
  });

  return app;
}
