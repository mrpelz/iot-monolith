import { collectDefaultMetrics, register } from 'prom-client';
import { HttpServer } from '../lib/http-server.js';
import { Tree } from '../lib/tree/main.js';
import { WebApi } from '../lib/web-api.js';
import { hooks } from '../lib/hooks.js';

export const app = async (): Promise<void> => {
  collectDefaultMetrics();

  const { logger } = await import('./logging.js');
  const { persistence } = await import('./persistence.js');
  const { system } = await import('./system.js');

  const run = Date.now().toString();

  const httpServer = new HttpServer(logger, 1337);
  httpServer.listen();

  const tree = new Tree(system);

  // eslint-disable-next-line no-new
  new WebApi(logger, httpServer, run, tree);

  hooks(httpServer, tree);

  process.on('exit', () => persistence.persist());
  await persistence.restore();

  httpServer.route('/metrics', async ({ response }) => {
    response.end(await register.metrics());
  });
};
