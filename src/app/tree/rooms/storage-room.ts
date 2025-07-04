import { epochs } from '../../../lib/epochs.js';
import { ev1527WindowSensor } from '../../../lib/tree/devices/ev1527-window-sensor.js';
import { shelly1 } from '../../../lib/tree/devices/shelly1.js';
import { deviceMap } from '../../../lib/tree/elements/device.js';
import { Level } from '../../../lib/tree/main.js';
import { outputGrouping } from '../../../lib/tree/properties/actuators.js';
import { offTimer } from '../../../lib/tree/properties/logic.js';
import { door } from '../../../lib/tree/properties/sensors.js';
import { context } from '../../context.js';
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
  wallswitch: devices.ceilingLight.internal.button.state,
};

export const properties = {
  ceilingLight: devices.ceilingLight.internal.relay,
  door: door(context, devices.doorSensor, undefined),
  lightTimer: offTimer(context, epochs.minute * 5, undefined),
};

export const groups = {
  allLights: outputGrouping(context, [properties.ceilingLight], 'lighting'),
};

(() => {
  let indicatorInProgress = false;

  instances.wallswitch.up(() =>
    properties.ceilingLight.flip.setState.trigger(),
  );

  instances.wallswitch.longPress(async () => {
    if (!properties.lightTimer.main.state.value) return;

    indicatorInProgress = true;

    await (properties.ceilingLight.main.setState.value
      ? ackBlinkFromOn(properties.ceilingLight.main.setState)
      : ackBlinkFromOff(properties.ceilingLight.main.setState));

    indicatorInProgress = false;

    properties.lightTimer.state.stop();
  });

  properties.door.open.main.state.observe((value) => {
    if (!value) return;
    properties.ceilingLight.main.setState.value = true;
  });

  properties.ceilingLight.main.setState.observe((value) => {
    if (indicatorInProgress) return;

    properties.lightTimer.state[value ? 'start' : 'stop']();
  }, true);

  properties.lightTimer.state.observe(() => {
    properties.ceilingLight.main.setState.value = false;
  });
})();

export const storageRoom = {
  $: 'storageRoom' as const,
  level: Level.ROOM as const,
  ...deviceMap(devices),
  ...groups,
  ...properties,
};
