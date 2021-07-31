import { hierarchyToObject } from '../lib/hierarchy.js';
import { logger } from './logging.js';
import { office } from './rooms/office.js';
import { start } from 'repl';

const log = logger.getInput({
  head: 'app',
});

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function app() {
  const tree = office();

  const repl = start({
    prompt: '🏠 ',
  });

  const { structure, values } = hierarchyToObject(tree);

  Object.assign(repl.context, {
    serialized: {
      structure: () => {
        log.info(() => JSON.stringify(structure(), null, 2));
      },
      values: () => {
        log.info(() => JSON.stringify(values(), null, 2));
      },
    },
    tree,
  });

  return tree;
}
