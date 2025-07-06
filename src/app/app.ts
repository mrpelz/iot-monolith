/* eslint-disable @typescript-eslint/ban-ts-comment */
import { collectDefaultMetrics, register } from 'prom-client';

import { WebApi } from '../lib/api/main.js';
import { httpHooks } from '../lib/http-hooks.js';
import { HttpServer } from '../lib/http-server.js';
// import {
//   anyBoolean,
//   excludePattern,
//   Level,
//   levelObjectMatch,
//   match,
// } from '../lib/tree/main.js';
import { init } from '../lib/tree/operations/init.js';
import { Introspection } from '../lib/tree/operations/introspection.js';
import { Serialization } from '../lib/tree/operations/serialization.js';
import { logicReasoningOutput } from './logging.js';

export const app = async (): Promise<void> => {
  collectDefaultMetrics();

  const { logger, logicReasoningLevel } = await import('./logging.js');
  const { persistence } = await import('./persistence.js');

  const { system: _system } = await import('./tree/system.js');

  const log = logger.getInput({ head: 'app' });
  log.log(logicReasoningLevel, () => 'logicReasoning log beginning');

  const system = await _system;

  const introspection = new Introspection(system);
  init(system, introspection);

  const serialization = new Serialization(system, introspection);

  // // eslint-disable-next-line no-console
  // serialization.updates.observe((value) => console.log(value));

  // // eslint-disable-next-line no-console
  // console.log(JSON.stringify(serialization.tree, undefined, 2));

  // // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // const lightingOn = match(
  //   { topic: 'lighting' as const },
  //   excludePattern,
  //   system,
  // ).flatMap((child) => match({ name: 'on' as const }, excludePattern, child));

  // const roomDevices = match(
  //   {
  //     $: 'testRoom' as const,
  //     level: Level.ROOM as const,
  //   },
  //   excludePattern,
  //   system,
  // ).flatMap((child) =>
  //   match(levelObjectMatch[Level.DEVICE], excludePattern, child),
  // );

  // // eslint-disable-next-line no-console
  // console.log(roomDevices.map((device) => device.$));

  // const [testRoom] = match({ $: 'testRoom' as const }, excludePattern, system);
  // const [lol] = match({ lol: anyBoolean }, undefined, testRoom);
  // // eslint-disable-next-line no-console
  // console.log(testRoom?.$, lol?.lol);

  // const [sunElevation] = match(
  //   { $: 'sunElevation' as const },
  //   excludePattern,
  //   system,
  // );

  // if (sunElevation) {
  //   // eslint-disable-next-line no-console
  //   console.log(
  //     introspection.getObject(sunElevation)?.id,
  //     introspection.getObject(sunElevation.isDay)?.id,
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

  httpServer.route('/logic-reasoning', async ({ response, utils }) => {
    if (utils.constrainMethod('GET')) return;

    response.setHeader('Content-Type', 'application/json');
    response.end(
      JSON.stringify(
        logicReasoningOutput.logs.map(([date, log_]) => [date.getTime(), log_]),
      ),
    );
  });

  httpServer.route('/metrics', async ({ response, utils }) => {
    if (utils.constrainMethod('GET')) return;

    response.setHeader('content-type', 'text/plain;charset=utf-8');
    response.end(await register.metrics());
  });

  process.on('exit', () => persistence.persist());
  await persistence.restore();

  log.info(() => 'started up successfully');
};
