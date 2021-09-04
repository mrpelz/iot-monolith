import { HttpServer } from '../lib/http-server.js';
import { Tree } from '../lib/tree.js';
import { WebApi } from '../lib/web-api.js';
import { logger } from './logging.js';
import { office } from './rooms/office.js';

const run = Date.now().toString();

// const log = logger.getInput({
//   head: 'app',
// });

const httpServer = new HttpServer(logger, 1337);
httpServer.listen();

export function app(): void {
  const root = office(logger);
  const tree = new Tree(root);

  // eslint-disable-next-line no-new
  new WebApi(logger, httpServer, run, tree);
}
