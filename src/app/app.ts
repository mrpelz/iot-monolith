import { collectDefaultMetrics, register } from 'prom-client';
import { HttpServer } from '../lib/http-server.js';
import { Paths } from '../lib/tree/operations/paths.js';
import { Serialization } from '../lib/tree/operations/serialization.js';
import { WebApi } from '../lib/web-api.js';
import { hooks } from '../lib/hooks.js';
import { init } from '../lib/tree/operations/init.js';
import { inspect } from 'node:util';

export const app = async (): Promise<void> => {
  collectDefaultMetrics();

  const { logger } = await import('./logging.js');
  const { persistence } = await import('./persistence.js');
  const { system: _system } = await import('./tree/system.js');

  const system = await _system;

  init(system);
  // const paths = new Paths(system);
  const { serialization } = new Serialization(system);

  // const lightingOn = system
  //   .matchChildrenDeep({ topic: 'lighting' as const })
  //   .flatMap((child) => child.matchChildrenDeep({ name: 'on' as const }));

  // const test = system.matchChildrenDeep({ $: 'sunElevation' as const })[0];

  // eslint-disable-next-line no-console
  // console.log(getPathFromElement(system, test));

  // eslint-disable-next-line no-console
  console.log(inspect(serialization, undefined, null));

  process.exit();

  const httpServer = new HttpServer(logger, 1337);
  httpServer.listen();

  // eslint-disable-next-line no-new
  // new WebApi(logger, httpServer, id, tree);

  // hooks(httpServer, tree);

  process.on('exit', () => persistence.persist());
  await persistence.restore();

  httpServer.route('/metrics', async ({ response }) => {
    response.end(await register.metrics());
  });
};
