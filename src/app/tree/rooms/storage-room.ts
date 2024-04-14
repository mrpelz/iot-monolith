/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { epochs } from '../../../lib/epochs.js';
import { ev1527WindowSensor } from '../../../lib/tree/devices/ev1527-window-sensor.js';
import { shelly1 } from '../../../lib/tree/devices/shelly1.js';
import { deviceMap } from '../../../lib/tree/elements/device.js';
import { Element, Level } from '../../../lib/tree/main.js';
import { outputGrouping } from '../../../lib/tree/properties/actuators.js';
import { offTimer } from '../../../lib/tree/properties/logic.js';
import { door } from '../../../lib/tree/properties/sensors.js';
import { logger } from '../../logging.js';
import { ackBlinkFromOff, ackBlinkFromOn } from '../../orchestrations.js';
import { persistence } from '../../persistence.js';
import { timings } from '../../timings.js';
import { ev1527Transport, rfBridge } from '../../tree/bridges.js';

export const devices = {
  ceilingLight: shelly1(
    logger,
    persistence,
    timings,
    'lighting' as const,
    'storage-ceilinglight.lan.wurstsalat.cloud',
  ),
  doorSensor: ev1527WindowSensor(logger, persistence, ev1527Transport, 55_632),
  rfBridge,
};

export const instances = {
  wallswitch: devices.ceilingLight.props.button.props.state,
};

export const properties = {
  ceilingLight: devices.ceilingLight.props.internal.relay,
  door: door(devices.doorSensor),
  lightTimer: offTimer(epochs.minute * 5, undefined, [
    'storageRoom/lightTimer',
    persistence,
  ]),
};

export const groups = {
  allLights: outputGrouping([properties.ceilingLight]),
};

(() => {
  let indicatorInProgress = false;

  instances.wallswitch.up(() =>
    properties.ceilingLight.props.flip.props.setState.trigger(),
  );

  instances.wallswitch.longPress(async () => {
    if (!properties.lightTimer.props.main.props.state.value) return;

    indicatorInProgress = true;

    await (properties.ceilingLight.props.main.props.setState.value
      ? ackBlinkFromOn(properties.ceilingLight.props.main.props.setState)
      : ackBlinkFromOff(properties.ceilingLight.props.main.props.setState));

    indicatorInProgress = false;

    // eslint-disable-next-line require-atomic-updates
    properties.lightTimer.props.active.props.state.value = false;
  });

  properties.door.props.open.props.main.props.state.observe((value) => {
    if (!value) return;
    properties.ceilingLight.props.main.props.setState.value = true;
  });

  properties.ceilingLight.props.main.props.setState.observe((value) => {
    if (indicatorInProgress) return;

    properties.lightTimer.props.active.props.state.value = value;
  }, true);

  properties.lightTimer.props.state.observe(() => {
    properties.ceilingLight.props.main.props.setState.value = false;
  });
})();

export const storageRoom = new Element({
  $: 'storageRoom' as const,
  ...deviceMap(devices),
  ...groups,
  ...properties,
  level: Level.ROOM as const,
});