import { HttpServer } from '../lib/http-server.js';
import { Tree } from '../lib/tree/main.js';
import { WebApi } from '../lib/web-api.js';
import { hooks } from '../lib/hooks.js';

export async function app(): Promise<void> {
  const { logger } = await import('./logging.js');
  const { system } = await import('./system.js');

  const run = Date.now().toString();

  const httpServer = new HttpServer(logger, 1337);
  httpServer.listen();

  const tree = new Tree(system);

  // eslint-disable-next-line no-new
  new WebApi(logger, httpServer, run, tree);

  hooks(httpServer, tree);
}
