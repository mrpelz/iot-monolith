import { Agent, get } from 'node:https';

import { epochs } from '@mrpelz/modifiable-date';
import { BooleanState } from '@mrpelz/observable/state';

import { makeCustomStringLogger } from '../../../lib/log.js';
import { DelimitedStream, TCPClient } from '../../../lib/tcp-client.js';
import { bareDevice } from '../../../lib/tree/devices/bare-device.js';
import { ev1527WindowSensor } from '../../../lib/tree/devices/ev1527-window-sensor.js';
import { shelly1WithInput } from '../../../lib/tree/devices/shelly1.js';
import { deviceMap } from '../../../lib/tree/elements/device.js';
import { getter } from '../../../lib/tree/elements/getter.js';
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
  lastChange,
} from '../../../lib/tree/properties/sensors.js';
import {
  CycleStage,
  WashingMachine,
} from '../../../lib/whirlpool/washing-machine.js';
import { context } from '../../context.js';
import { logger, logicReasoningLevel } from '../../logging.js';
import { ev1527Transport, rfBridge } from '../../tree/bridges.js';
import { automatedInputLogic } from '../../util.js';

const WASHER_DRYER_DEBUG_CONNECT = false;
const WASHER_DRYER_MESSAGE_SEPARATOR = Buffer.from([0x00, 0x09]);
const DRYER_MESSAGE_START = Buffer.from([0xbb, 0xb6, 0x11, 0x43]);
const DRYER_MESSAGE_END = Buffer.from([
  0x67, 0x5d, 0x7f, 0x6f, 0xa5, 0xe9, 0xd9, 0x6d, 0x00,
]);

const WIIM_OFFICE_BASE_URL = 'https://wiim-office.lan.wurstsalat.cloud';
const WASHER_DRYER_NOTIFICATION_URL = 'https://cdn.zeyel.net/washer_done.mp3';
const WASHER_DRYER_NOTIFICATION_LENGTH_MS = 45000;

const wiimOfficeVolumeUrl = new URL(
  '/httpapi.asp?command=setPlayerCmd:vol:30',
  WIIM_OFFICE_BASE_URL,
);

const wiimOfficePlayUrl = new URL(
  `/httpapi.asp?command=setPlayerCmd:play:${encodeURIComponent(WASHER_DRYER_NOTIFICATION_URL)}`,
  WIIM_OFFICE_BASE_URL,
);

const wiimOfficeStopUrl = new URL(
  '/httpapi.asp?command=setPlayerCmd:stop',
  WIIM_OFFICE_BASE_URL,
);

const agent = new Agent({
  rejectUnauthorized: false,
});

const washerSocket = new TCPClient(
  'storageroom-washerdryerbridge.lan.wurstsalat.cloud',
  1338,
  undefined,
  epochs.minute * 5,
);
const washerState = new WashingMachine(washerSocket);

const dryerSocket = new TCPClient(
  'storageroom-washerdryerbridge.lan.wurstsalat.cloud',
  1337,
  undefined,
  epochs.minute * 5,
);

const washerDryerNotification = new BooleanState(false);
const dryerNotificationEnable = new BooleanState(true);
const washerNotificationEnable = new BooleanState(true);

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
    undefined,
    WASHER_DRYER_DEBUG_CONNECT || undefined,
  ),
};

export const instances = {
  wallswitch: devices.ceilingLight.button,
};

export const properties = {
  ceilingLight: devices.ceilingLight.relay,
  door: door_(context, devices.doorSensor, undefined),
  dryer: {
    $: 'dryer' as const,
    isRunning: externalState(
      context,
      ValueType.BOOLEAN,
      'isRunning',
      'appliance',
    ),
    isSocketConnected: {
      lastChange: lastChange(context, dryerSocket.isConnected),
      main: getter(ValueType.BOOLEAN, dryerSocket.isConnected),
    },
  },
  motion: devices.ceilingLight.input,
  washer: {
    $: 'washer' as const,
    activity: getter(ValueType.RAW, washerState.activity),
    estimate: getter(ValueType.RAW, washerState.estimate),
    isDoorLocked: getter(ValueType.BOOLEAN, washerState.isDoorLocked),
    isOn: getter(ValueType.BOOLEAN, washerState.isOn),
    isRunning: getter(ValueType.BOOLEAN, washerState.isRunning),
    isRunningExcludingFreshFinish: getter(
      ValueType.BOOLEAN,
      washerState.isRunningExcludingFreshFinish,
    ),
    isSocketConnected: {
      lastChange: lastChange(context, washerSocket.isConnected),
      main: getter(ValueType.BOOLEAN, washerSocket.isConnected),
    },
    maxLoad: getter(ValueType.RAW, washerState.maxLoad),
    remainingMinutes: getter(ValueType.NUMBER, washerState.remainingMinutes),
    selection: getter(ValueType.RAW, washerState.selection),
    stage: getter(ValueType.NUMBER, washerState.stage),
    status: getter(ValueType.RAW, washerState.status),
  },
};

export const groups = {
  allLights: outputGrouping(context, [properties.ceilingLight], 'lighting'),
};

export const logic = {
  ceilingLightLogic: automatedInputLogic(
    properties.ceilingLight,
    [properties.motion, properties.door],
    [instances.wallswitch],
    epochs.minute * 5,
  ),
};

export const scenes = {
  dryerNotificationEnable: scene(
    context,
    [new SceneMember(dryerNotificationEnable, true, false)],
    'automation',
    true,
  ),
  washerDryerNotification: scene(
    context,
    [new SceneMember(washerDryerNotification, true, false)],
    'notification',
  ),
  washerNotificationEnable: scene(
    context,
    [new SceneMember(washerNotificationEnable, true, false)],
    'automation',
    true,
  ),
};

const $init: InitFunction = (room, introspection) => {
  const { washerDryerBridge } = devices;
  const { ceilingLight, door, dryer, motion } = properties;

  const p = makePathStringRetriever(introspection);
  const l = makeCustomStringLogger(
    logger.getInput({
      head: p(room),
    }),
    logicReasoningLevel,
  );

  if (context.connect || WASHER_DRYER_DEBUG_CONNECT) {
    washerDryerBridge.device.online.main.state.observe((isOnline) => {
      if (isOnline) {
        washerSocket.connect();
        dryerSocket.connect();

        return;
      }

      washerSocket.disconnect();
      dryerSocket.disconnect();
    });
  }

  washerSocket.isConnected.observe((online) => {
    l(`washerSocket ${online ? '' : 'dis'}connected`);
  });

  washerState.isDoorLocked.observe((value) => {
    l(`washerState isDoorLocked: ${value}`);
  });
  washerState.isOn.observe((value) => {
    l(`washerState isOn: ${value}`);
  });
  washerState.isRunning.observe((value) => {
    l(`washerState isRunning: ${value}`);
  });
  washerState.isRunningExcludingFreshFinish.observe((value) => {
    l(`washerState isRunningExcludingFreshFinish: ${value}`);
  });
  washerState.remainingMinutes.observe((value) => {
    l(`washerState remainingMinutes: ${value}`);
  });
  washerState.stage.observe((value) => {
    l(`washerState stage: ${value === null ? null : CycleStage[value]}`);
  });

  dryerSocket.isConnected.observe((online) => {
    l(`dryerSocket ${online ? '' : 'dis'}connected`);
  });

  dryerSocket
    .pipe(new DelimitedStream(WASHER_DRYER_MESSAGE_SEPARATOR))
    .on('data', (data: Buffer) => {
      if (data.equals(DRYER_MESSAGE_START)) {
        dryer.isRunning.state.inject(true);
      } else if (data.equals(DRYER_MESSAGE_END)) {
        dryer.isRunning.state.inject(false);
      }
    });

  dryerNotificationEnable.observe((value, _observer, _changed, origin) => {
    if (value) return;

    washerDryerNotification.set(false, origin);
  });

  washerNotificationEnable.observe((value, _observer, _changed, origin) => {
    if (value) return;

    washerDryerNotification.set(false, origin);
  });

  door.open.state.observe((value, _observer, _changed, origin) => {
    if (!value) return;

    washerDryerNotification.set(false, origin);
  });

  motion.state.observe((value, _observer, _changed, origin) => {
    if (!value) return;

    washerDryerNotification.set(false, origin);
  });

  washerState.stage.observe((value, _observer, _changed, origin) => {
    // do not set notification when running state is uncertain
    if (value === null) return;

    // do not set notification when automation is disabled
    if (!washerNotificationEnable.value) return;

    const hasEnded =
      value === CycleStage.END || value === CycleStage.FRESH_FINISH;

    // do not set notification when ceiling light is on and machine transitions to stopped
    if (ceilingLight.main.setState.value && hasEnded) return;

    // do not run if night
    const now = new Date();
    if (now.getHours() > 23 || now.getHours() < 6) return;

    washerDryerNotification.set(hasEnded, origin);
  });

  dryer.isRunning.main.state.observe((value, _observer, _changed, origin) => {
    // do not set notification when running state is uncertain
    if (value === null) return;

    // do not set notification when automation is disabled
    if (!dryerNotificationEnable.value) return;

    // do not set notification when ceiling light is on and machine transitions to stopped
    if (ceilingLight.main.setState.value && !value) return;

    // do not run if night
    const now = new Date();
    if (now.getHours() > 23 || now.getHours() < 6) return;

    washerDryerNotification.set(!value, origin);
  });

  let notificationPlayTimeout: NodeJS.Timeout | undefined;

  washerDryerNotification.observe((value, _observer, _changed, origin) => {
    clearTimeout(notificationPlayTimeout);

    try {
      if (!value) {
        get(wiimOfficeStopUrl, { agent, timeout: epochs.second });
        return;
      }

      get(wiimOfficeVolumeUrl, { agent, timeout: epochs.second });
      get(wiimOfficePlayUrl, { agent, timeout: epochs.second });

      notificationPlayTimeout = setTimeout(
        () => washerDryerNotification.set(false, origin),
        WASHER_DRYER_NOTIFICATION_LENGTH_MS,
      );
    } catch {
      clearTimeout(notificationPlayTimeout);
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
