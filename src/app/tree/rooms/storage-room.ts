import { epochs } from '@mrpelz/modifiable-date';

import { makeCustomStringLogger } from '../../../lib/log.js';
import { ev1527WindowSensor } from '../../../lib/tree/devices/ev1527-window-sensor.js';
import { shelly1 } from '../../../lib/tree/devices/shelly1.js';
import { deviceMap } from '../../../lib/tree/elements/device.js';
import { flipMain, getMain, setMain } from '../../../lib/tree/logic.js';
import { Level } from '../../../lib/tree/main.js';
import { InitFunction } from '../../../lib/tree/operations/init.js';
import { makePathStringRetriever } from '../../../lib/tree/operations/introspection.js';
import { outputGrouping } from '../../../lib/tree/properties/actuators.js';
import { offTimer } from '../../../lib/tree/properties/logic.js';
import { door } from '../../../lib/tree/properties/sensors.js';
import { context } from '../../context.js';
import { logger, logicReasoningLevel } from '../../logging.js';
import { ackBlinkFromOff, ackBlinkFromOn } from '../../orchestrations.js';
import { ev1527Transport, rfBridge } from '../../tree/bridges.js';

export const devices = {
  ceilingLight: shelly1(
    'lighting' as const,
    'storage-ceilinglight.lan.wurstsalat.cloud',
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
  door: door(context, devices.doorSensor, undefined),
  lightTimer: offTimer(context, epochs.minute * 5, undefined),
};

export const groups = {
  allLights: outputGrouping(context, [properties.ceilingLight], 'lighting'),
};

const $init: InitFunction = (room, introspection) => {
  const { wallswitch } = instances;
  const { ceilingLight, door: door_, lightTimer } = properties;

  const p = makePathStringRetriever(introspection);
  const l = makeCustomStringLogger(
    logger.getInput({
      head: p(room),
    }),
    logicReasoningLevel,
  );

  let indicatorInProgress = false;

  wallswitch.state.up(() =>
    flipMain(ceilingLight, () =>
      l(
        `${p(wallswitch)} ${wallswitch.state.up.name} flipped ${p(ceilingLight)}`,
      ),
    ),
  );

  wallswitch.state.longPress(async () => {
    if (!lightTimer.state.isEnabled.value) {
      l(
        `${p(wallswitch)} ${wallswitch.state.longPress.name} didn’t do anything, because ${p(lightTimer)} is disabled`,
      );

      return;
    }

    indicatorInProgress = true;

    await (getMain(ceilingLight)
      ? ackBlinkFromOn(ceilingLight.main.setState)
      : ackBlinkFromOff(ceilingLight.main.setState));

    indicatorInProgress = false;

    lightTimer.state.stop();

    l(
      `${p(wallswitch)} ${wallswitch.state.longPress.name} triggered blink-orchestration and stopped ${p(lightTimer)}`,
    );
  });

  door_.open.main.state.observe((open) => {
    if (!open) return;

    setMain(ceilingLight, true, () =>
      l(`${p(door_)} was opened and turned on ${p(ceilingLight)}`),
    );
  });

  ceilingLight.main.setState.observe((value, _observer, changed) => {
    if (indicatorInProgress) return;

    if (changed) {
      l(
        `${p(lightTimer)} was ${value ? 'started' : 'stopped'} because ${p(ceilingLight)} was turned ${value ? 'on' : 'off'}`,
      );
    }

    lightTimer.state[value ? 'start' : 'stop']();
  }, true);

  lightTimer.state.observe(() =>
    setMain(ceilingLight, false, () =>
      l(`${p(ceilingLight)} was turned off because ${p(lightTimer)} ran out`),
    ),
  );
};

export const storageRoom = {
  $: 'storageRoom' as const,
  $init,
  devices: deviceMap(devices),
  level: Level.ROOM as const,
  ...groups,
  ...instances,
  ...properties,
};
