import { collectDefaultMetrics, register } from 'prom-client';
import { HttpServer } from '../lib/http-server.js';
import { Tree } from '../lib/tree/util.js';
import { WebApi } from '../lib/web-api.js';
import { hooks } from '../lib/hooks.js';
import { inspect } from 'node:util';

export const app = async (): Promise<void> => {
  // collectDefaultMetrics();

  const { logger } = await import('./logging.js');
  const { persistence } = await import('./persistence.js');
  const {
    system: { id, system },
  } = await import('./system.js');

  const lightingOn = system
    .matchChildrenDeep({ topic: 'lighting' as const })
    .flatMap((child) => child.matchChildrenDeep({ name: 'on' as const }));

  for (const light of lightingOn) {
    light.props.setState.value = false;
  }

  const test = system.matchChildrenDeep({ $: 'firstFloor' as const });

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
