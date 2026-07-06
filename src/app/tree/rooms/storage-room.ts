import { epochs } from '@mrpelz/modifiable-date';
import { BooleanState, NullState } from '@mrpelz/observable/state';

import { makeCustomStringLogger } from '../../../lib/log.js';
import { DelimitedStream, TCPClient } from '../../../lib/tcp-client.js';
import { ev1527WindowSensor } from '../../../lib/tree/devices/ev1527-window-sensor.js';
import { shelly1WithInput } from '../../../lib/tree/devices/shelly1.js';
import { deviceMap } from '../../../lib/tree/elements/device.js';
import { Level } from '../../../lib/tree/main.js';
import { InitFunction } from '../../../lib/tree/operations/init.js';
import { makePathStringRetriever } from '../../../lib/tree/operations/introspection.js';
import {
  outputGrouping,
  scene,
  SceneMember,
} from '../../../lib/tree/properties/actuators.js';
import { door as door_ } from '../../../lib/tree/properties/sensors.js';
import { context } from '../../context.js';
import { logger, logicReasoningLevel } from '../../logging.js';
import { ev1527Transport, rfBridge } from '../../tree/bridges.js';
import { automatedInputLogic } from '../../util.js';

const WASHER_DRYER_DEBUG_CONNECT = false;
const WASHER_DRYER_MESSAGE_SEPARATOR = Buffer.from([0x00, 0x09]);

export const devices = {
  ceilingLight: shelly1WithInput(
    'lighting' as const,
    'motion' as const,
    'storageroom-ceilinglight.lan.wurstsalat.cloud',
    context,
  ),
  doorSensor: ev1527WindowSensor(55_632, ev1527Transport, context),
  rfBridge,
};

export const instances = {
  wallswitch: devices.ceilingLight.button,
};

export const properties = {
  ceilingLight: devices.ceilingLight.relay,
  door: door_(context, devices.doorSensor, undefined),
  motion: devices.ceilingLight.input,
};

export const groups = {
  allLights: outputGrouping(context, [properties.ceilingLight], 'lighting'),
};

export const logic = {
  ceilingLightLogic: automatedInputLogic(
    properties.ceilingLight,
    [properties.motion, properties.door],
    [instances.wallswitch],
    epochs.minute,
  ),
};

const washerSocket = new TCPClient(
  'storageroom-washerdryerbridge.lan.wurstsalat.cloud',
  1338,
);
const dryerSocket = new TCPClient(
  'storageroom-washerdryerbridge.lan.wurstsalat.cloud',
  1337,
);

const isWasherDryerNotificationEnable = new BooleanState(true);
const washerDone = new NullState();
const dryerDone = new NullState();

export const scenes = {
  washerDryerNotificationEnable: scene(
    context,
    [new SceneMember(isWasherDryerNotificationEnable, true, false)],
    'automation',
  ),
};

const $init: InitFunction = (room, introspection) => {
  const p = makePathStringRetriever(introspection);
  const l = makeCustomStringLogger(
    logger.getInput({
      head: p(room),
    }),
    logicReasoningLevel,
  );

  if (WASHER_DRYER_DEBUG_CONNECT) {
    washerSocket.connect();
    dryerSocket.connect();
  }

  washerSocket.on('connect', () => l('washer connected'));
  washerSocket.on('close', () => l('washer disconnected'));
  dryerSocket.on('connect', () => l('dryer connected'));
  dryerSocket.on('close', () => l('dryer disconnected'));

  washerSocket
    .pipe(new DelimitedStream(WASHER_DRYER_MESSAGE_SEPARATOR))
    .on('data', (data: Buffer) => {
      // console.log('washer data', data.toString('hex')),
    });

  dryerSocket
    .pipe(new DelimitedStream(WASHER_DRYER_MESSAGE_SEPARATOR))
    .on('data', (data: Buffer) => {
      // console.log('dryer data', data.toString('hex')),
    });
};

export const storageRoom = {
  $: 'storageRoom' as const,
  $init,
  devices: deviceMap(devices),
  level: Level.ROOM as const,
  ...groups,
  ...instances,
  ...logic,
  ...properties,
  ...scenes,
};
