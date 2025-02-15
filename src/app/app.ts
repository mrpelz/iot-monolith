/* eslint-disable @typescript-eslint/ban-ts-comment */
import { collectDefaultMetrics, register } from 'prom-client';

import { WebApi } from '../lib/api/main.js';
import { httpHooks } from '../lib/http-hooks.js';
import { HttpServer } from '../lib/http-server.js';
import { init } from '../lib/tree/operations/init.js';
import { Introspection } from '../lib/tree/operations/introspection.js';
import { setupMetrics } from '../lib/tree/operations/metrics.js';
import { Serialization } from '../lib/tree/operations/serialization.js';

export const app = async (): Promise<void> => {
  collectDefaultMetrics();

  const { logger } = await import('./logging.js');
  const { persistence } = await import('./persistence.js');

  const { system: _system } = await import('./tree/system.js');

  const log = logger.getInput({ head: 'app' });

  const system = await _system;

  const introspection = new Introspection(system);
  init(system);

  const serialization = new Serialization(system, introspection);

  setupMetrics(logger, system, introspection);

  // // eslint-disable-next-line no-console
  // serialization.updates.observe((value) => console.log(value));

  // // eslint-disable-next-line no-console
  // console.log(JSON.stringify(serialization.tree, undefined, 2));

  // // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // const lightingOn = match({ topic: 'lighting' as const }, system).flatMap(
  //   (child) => match({ name: 'on' as const }, child),
  // );

  // const roomDevices = match(
  //   {
  //     $: 'testRoom' as const,
  //     level: Level.ROOM as const,
  //   },
  //   system,
  // ).flatMap((child) => match(levelObjectMatch[Level.DEVICE], child));

  // // eslint-disable-next-line no-console
  // console.log(roomDevices.map((device) => device.$));

  // const [testRoom] = match({ $: 'testRoom' as const }, system);
  // const [lol] = match({ lol: anyBoolean }, testRoom);
  // // eslint-disable-next-line no-console
  // console.log(lol);

  // const [sunElevation] = match({ $: 'sunElevation' as const }, system);

  // if (sunElevation) {
  //   // eslint-disable-next-line no-console
  //   console.log(
  //     paths.getByObject(sunElevation)?.id,
  //     paths.getParent(sunElevation.isDay)?.id,
  //   );
  // }

  // // eslint-disable-next-line no-console
  // console.log(
  //   system.wurstHome.sonninstraße16.firstFloor.testRoom.temperature.main.unit,
  //   // @ts-ignore
  //   serialization.tree.wurstHome.sonninstraße16.firstFloor.testRoom.temperature
  //     .main.unit,
  // );

  // serialization.inject(['fc604c87-a64c-5b70-8595-ae9a407cfe84', null]);

  const httpServer = new HttpServer(logger, 1337);

  // @ts-ignore
  // eslint-disable-next-line no-new
  new WebApi(logger, httpServer, serialization);

  httpHooks(logger, httpServer, serialization);

  httpServer.listen();

  process.on('exit', () => persistence.persist());
  await persistence.restore();

  httpServer.route('/metrics', async ({ response }) => {
    response.setHeader('content-type', 'text/plain;charset=utf-8');
    response.end(await register.metrics());
  });

  log.info(() => 'started up successfully');
};
