import { HttpServer } from '../lib/http-server.js';
import { handleSignal } from '../index.js';
import { hierarchyToObject } from '../lib/hierarchy.js';
import { logger } from './logging.js';
import { office } from './rooms/office.js';
import { start } from 'repl';

const log = logger.getInput({
  head: 'app',
});

export const httpServer = new HttpServer(logger, 1337);
httpServer.listen();

export const tree = office(logger);

export function app(): void {
  const repl = start({
    prompt: '🏠 ',
  });

  const { structure, values } = hierarchyToObject(tree);

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
