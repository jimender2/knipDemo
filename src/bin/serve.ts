import { buildServer } from '../api/server.js';
import { log } from '../util/logger.js';

const port = Number(process.env['PORT'] ?? 4310);
const host = process.env['HOST'] ?? '127.0.0.1';

const app = await buildServer({ logger: false });

try {
  await app.listen({ port, host });
  log.info(`cards api listening on http://${host}:${port}`);
} catch (error) {
  log.error('failed to start server', error);
  process.exit(1);
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    void app.close().then(() => process.exit(0));
  });
}
