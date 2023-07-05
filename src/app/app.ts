import { collectDefaultMetrics, register } from 'prom-client';
import { HttpServer } from '../lib/http-server.js';
import { Tree } from '../lib/tree/util.js';
import { WebApi } from '../lib/web-api.js';
import { getPath } from '../lib/tree/main.js';
import { hooks } from '../lib/hooks.js';
import { inspect } from 'node:util';

export const app = async (): Promise<void> => {
  // collectDefaultMetrics();

  const { logger } = await import('./logging.js');
  const { persistence } = await import('./persistence.js');
  const { system } = await import('./system.js');

  for (const element of system.matchChildrenDeep({ init: true })) {
    element.props.initCallback();
  }

  const lightingOn = system
    .matchChildrenDeep({ topic: 'lighting' as const })
    .flatMap((child) => child.matchChildrenDeep({ name: 'on' as const }));

  const test = system.matchChildrenDeep({ $: 'sunElevation' as const })[0];

  const allOutputs = [
    system.matchChildrenDeep({ $: 'output' as const }),
    system.matchChildrenDeep({ $: 'led' as const }),
  ].flat(1);

  const allLights = [
    system.matchChildrenDeep({
      $: 'output' as const,
      topic: 'lighting' as const,
    }),
    system.matchChildrenDeep({ $: 'led' as const }),
  ].flat(1);

  // eslint-disable-next-line no-console
  console.log(test);

  // eslint-disable-next-line no-console
  console.log(getPath(system, test));

  // eslint-disable-next-line no-console
  console.log(getPath(system, lightingOn[30]));

  // eslint-disable-next-line no-console
  console.log(allOutputs.length);

  // eslint-disable-next-line no-console
  console.log(allOutputs.map((child) => getPath(system, child)));

  // eslint-disable-next-line no-console
  console.log(allLights.length);

  // eslint-disable-next-line no-console
  console.log(allLights.map((child) => getPath(system, child)));

  process.exit();

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
