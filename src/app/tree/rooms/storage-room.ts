import { epochs } from '@mrpelz/modifiable-date';
import { BooleanState } from '@mrpelz/observable/state';

import { makeCustomStringLogger } from '../../../lib/log.js';
import { DelimitedStream, TCPClient } from '../../../lib/tcp-client.js';
import { bareDevice } from '../../../lib/tree/devices/bare-device.js';
import { ev1527WindowSensor } from '../../../lib/tree/devices/ev1527-window-sensor.js';
import { shelly1WithInput } from '../../../lib/tree/devices/shelly1.js';
import { deviceMap } from '../../../lib/tree/elements/device.js';
import { Level, ValueType } from '../../../lib/tree/main.js';
import { InitFunction } from '../../../lib/tree/operations/init.js';
import { makePathStringRetriever } from '../../../lib/tree/operations/introspection.js';
import {
  outputGrouping,
  scene,
  SceneMember,
} from '../../../lib/tree/properties/actuators.js';
import {
  door as door_,
  externalState,
} from '../../../lib/tree/properties/sensors.js';
import { context } from '../../context.js';
import { logger, logicReasoningLevel } from '../../logging.js';
import { ev1527Transport, rfBridge } from '../../tree/bridges.js';
import { automatedInputLogic } from '../../util.js';

const WASHER_DRYER_DEBUG_CONNECT = false;
const WASHER_DRYER_MESSAGE_SEPARATOR = Buffer.from([0x00, 0x09]);
const WASHER_MESSAGE_START = Buffer.from([0x6e, 0x58, 0x6e, 0x7b, 0xfb]);
const WASHER_MESSAGE_END = Buffer.from([0x6e, 0x58, 0x6e, 0x7b, 0x79]);
const DRYER_MESSAGE_START = Buffer.from([0xbb, 0xb6, 0x11, 0x43]);
const DRYER_MESSAGE_END = Buffer.from([
  0x67, 0x5d, 0x7f, 0x6f, 0xa5, 0xe9, 0xd9, 0x6d, 0x00,
]);

export const devices = {
  ceilingLight: shelly1WithInput(
    'lighting' as const,
    'motion' as const,
    'storageroom-ceilinglight.lan.wurstsalat.cloud',
    context,
  ),
  doorSensor: ev1527WindowSensor(55_632, ev1527Transport, context),
  rfBridge,
  washerDryerBridge: bareDevice(
    'storageroom-washerdryerbridge.lan.wurstsalat.cloud',
    context,
  ),
};

export const instances = {
  wallswitch: devices.ceilingLight.button,
};

export const properties = {
  ceilingLight: devices.ceilingLight.relay,
  door: door_(context, devices.doorSensor, undefined),
  dryerRunning: externalState(context, ValueType.BOOLEAN, 'dryer', 'appliance'),
  motion: devices.ceilingLight.input,
  washerRunning: externalState(
    context,
    ValueType.BOOLEAN,
    'washer',
    'appliance',
  ),
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

export const scenes = {
  washerDryerNotificationEnable: scene(
    context,
    [new SceneMember(isWasherDryerNotificationEnable, true, false)],
    'automation',
  ),
};

const $init: InitFunction = (room, introspection) => {
  const { dryerRunning, washerRunning } = properties;

  const p = makePathStringRetriever(introspection);
  const l = makeCustomStringLogger(
    logger.getInput({
      head: p(room),
    }),
    logicReasoningLevel,
  );

  if (context.connect || WASHER_DRYER_DEBUG_CONNECT) {
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
      if (
        data
          .subarray(0, WASHER_MESSAGE_START.length)
          .equals(WASHER_MESSAGE_START)
      ) {
        washerRunning.state.inject(true);
      } else if (
        data.subarray(0, WASHER_MESSAGE_END.length).equals(WASHER_MESSAGE_END)
      ) {
        washerRunning.state.inject(false);
      }
    });

  dryerSocket
    .pipe(new DelimitedStream(WASHER_DRYER_MESSAGE_SEPARATOR))
    .on('data', (data: Buffer) => {
      if (data.equals(DRYER_MESSAGE_START)) {
        dryerRunning.state.inject(true);
      } else if (data.equals(DRYER_MESSAGE_END)) {
        dryerRunning.state.inject(false);
      }
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
