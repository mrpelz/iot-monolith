import { collectDefaultMetrics, register } from 'prom-client';
import { matchValue, symbolKey } from '../lib/tree/main.js';
import { HttpServer } from '../lib/http-server.js';
import { Tree } from '../lib/tree/util.js';
import { WebApi } from '../lib/web-api.js';
import { hooks } from '../lib/hooks.js';
import { inspect } from 'node:util';
import { selectSetter } from '../lib/tree/elements/setter.js';

export const app = async (): Promise<void> => {
  // collectDefaultMetrics();

  const { logger } = await import('./logging.js');
  const { persistence } = await import('./persistence.js');
  const {
    system: { id, system },
  } = await import('./system.js');

  system.init();

  // eslint-disable-next-line no-console
  console.log(inspect(system.toString(), undefined, null));
  // eslint-disable-next-line no-console
  console.log('\n\n__________\n\n');

  for (const element of system
    .matchAllChildren({ topic: [matchValue, 'lighting' as const] })
    .map((result) =>
      result?.matchAllChildren(
        {
          [symbolKey]: [matchValue, '$' as const],
        },
        1
      )
    )
    .flat()) {
    // eslint-disable-next-line no-console
    console.log(inspect(element?.toString(), undefined, null));

    // eslint-disable-next-line no-console
    console.log('\n\n__________\n\n');
  }

  // const httpServer = new HttpServer(logger, 1337);
  // httpServer.listen();

  // const tree = new Tree(system);

  // // eslint-disable-next-line no-new
  // new WebApi(logger, httpServer, id, tree);

  // hooks(httpServer, tree);

  // process.on('exit', () => persistence.persist());
  // await persistence.restore();

  // httpServer.route('/metrics', async ({ response }) => {
  //   response.end(await register.metrics());
  // });
};
