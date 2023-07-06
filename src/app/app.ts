import { Element, getPath } from '../lib/tree/main.js';
import { collectDefaultMetrics, register } from 'prom-client';
import { HttpServer } from '../lib/http-server.js';
import { Tree } from '../lib/tree/util.js';
import { WebApi } from '../lib/web-api.js';
import { hooks } from '../lib/hooks.js';
import { inspect } from 'node:util';
import { isNullState } from '../lib/state.js';
import { isObservable } from '../lib/observable.js';

export const app = async (): Promise<void> => {
  // collectDefaultMetrics();

  const { logger } = await import('./logging.js');
  const { persistence } = await import('./persistence.js');
  const { system: _system } = await import('./tree/system.js');

  const system = await _system;

  for (const element of system.matchChildrenDeep({ init: true as const })) {
    element.props.initCallback(element);
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

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      system,
      (key, value) => {
        if (value === null) return value;

        if (
          ['boolean', 'number', 'string', 'undefined'].includes(typeof value)
        ) {
          return value;
        }

        if (value instanceof Element) return value.props;

        if (isObservable(value)) {
          return '<Observable>';
        }

        if (isNullState(value)) {
          return '<NullState>';
        }

        if (key === 'internal' && typeof value === 'object') return value;

        return undefined;
      },
      2
    )
  );

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
