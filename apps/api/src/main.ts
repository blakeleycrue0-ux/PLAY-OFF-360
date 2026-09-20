import { createApiContext } from './context.js';
import { buildApp } from './app.js';

async function main(): Promise<void> {
  const ctx = createApiContext();
  const app = buildApp(ctx);

  const port = Number(process.env['API_PORT'] ?? 3000);
  const host = process.env['API_HOST'] ?? '0.0.0.0';

  await app.listen({ port, host });
  console.log(`API escuchando en http://${host}:${port}`);

  const shutdown = async (): Promise<void> => {
    await app.close();
    await ctx.pool.end();
  };
  process.on('SIGINT', () => {
    void shutdown();
  });
  process.on('SIGTERM', () => {
    void shutdown();
  });
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? (error.stack ?? error.message) : error);
  process.exitCode = 1;
});
