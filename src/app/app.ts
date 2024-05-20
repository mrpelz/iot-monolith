import { collectDefaultMetrics, register } from 'prom-client';

import { WebApi } from '../lib/api/main.js';
import { WebApiXML } from '../lib/api/xml.js';
import { httpHooks } from '../lib/http-hooks.js';
import { HttpServer } from '../lib/http-server.js';
import { Level } from '../lib/tree/main.js';
import { init } from '../lib/tree/operations/init.js';
import { setupMetrics } from '../lib/tree/operations/metrics.js';
import { Paths } from '../lib/tree/operations/paths.js';
import { Serialization } from '../lib/tree/operations/serialization.js';

export const app = async (): Promise<void> => {
  collectDefaultMetrics();

  const { logger } = await import('./logging.js');
  // const { persistence } = await import('./persistence.js');
  const { system: _system } = await import('./tree/system.js');

  const system = await _system;

  const paths = new Paths(system);
  init(system);

  const serialization = new Serialization(system, paths);

  setupMetrics(logger, system, paths);

  // eslint-disable-next-line no-console
  serialization.updates.observe((value) => console.log(value));

  // eslint-disable-next-line no-console
  console.log(JSON.stringify(serialization.tree, undefined, 2));

  serialization.inject(['4fd1241a-2b6e-5dc6-8636-0a2875ffe37e', null]);

  // const lightingOn = system
  //   .matchChildrenDeep({ topic: 'lighting' as const })
  //   .flatMap((child) => child.matchChildrenDeep({ name: 'on' as const }));

  const roomDevices = system
    .matchChildrenDeep({
      $: 'testRoom' as const,
      level: Level.ROOM as const,
    })
    .flatMap((child) =>
      child.matchChildrenDeep({ level: Level.DEVICE as const }),
    );

  // eslint-disable-next-line no-console
  console.log(roomDevices.map((device) => device.props.$));

  const test = system.matchChildrenDeep({ $: 'sunElevation' as const })[0];

  // eslint-disable-next-line no-console
  console.log(paths.getByElement(test)?.path);

  const httpServer = new HttpServer(logger, 1337);

  // eslint-disable-next-line no-new
  new WebApi(logger, httpServer, serialization);

  // eslint-disable-next-line no-new
  new WebApiXML(logger, httpServer, serialization);

  httpHooks(logger, httpServer, serialization);

  httpServer.listen();

  // process.on('exit', () => persistence.persist());
  // await persistence.restore();

  httpServer.route('/metrics', async ({ response }) => {
    response.setHeader('content-type', 'text/plain;charset=utf-8');
    response.end(await register.metrics());
  });
};
