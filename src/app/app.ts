import { HttpServer } from '../lib/http-server.js';
import { Tree } from '../lib/tree.js';
import { WebApi } from '../lib/web-api.js';
import { handleSignal } from '../index.js';
import { logger } from './logging.js';
import { office } from './rooms/office.js';
import { start } from 'repl';

const run = Date.now().toString();

const log = logger.getInput({
  head: 'app',
});

const httpServer = new HttpServer(logger, 1337);
httpServer.listen();

export function app(): void {
  const repl = start({
    prompt: '🏠 ',
  });

  const tree = new Tree(office(logger));

  // eslint-disable-next-line no-new
  new WebApi(logger, httpServer, run, tree);

  const { structure, values } = tree;

  Object.assign(repl.context, {
    structure: () => {
      log.info(() => JSON.stringify(structure, null, 2));
    },
    tree,
    values: () => {
      log.info(() => JSON.stringify(values(), null, 2));
    },
  });

  process.on('beforeExit', () => repl.close());
  repl.on('SIGINT', () => handleSignal('SIGINT'));
}
