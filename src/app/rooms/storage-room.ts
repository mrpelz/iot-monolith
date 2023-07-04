/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Element, Level } from '../../lib/tree/main.js';
import { ackBlinkFromOff, ackBlinkFromOn } from '../orchestrations.js';
import { ev1527Transport, rfBridge } from '../bridges.js';
import { epochs } from '../../lib/epochs.js';
import { ev1527WindowSensor } from '../../lib/tree/devices/ev1527-window-sensor.js';
import { logger } from '../logging.js';
import { offTimer } from '../../lib/tree/properties/logic.js';
import { outputGrouping } from '../../lib/tree/properties/actuators.js';
import { persistence } from '../persistence.js';
import { shelly1 } from '../../lib/tree/devices/shelly1.js';
import { timings } from '../timings.js';

export const devices = {
  ceilingLight: shelly1(
    logger,
    persistence,
    timings,
    'lighting',
    'storage-ceilinglight.lan.wurstsalat.cloud'
  ),
  doorSensor: ev1527WindowSensor(logger, persistence, ev1527Transport, 55632),
  rfBridge,
};

export const instances = {
  wallswitch: devices.ceilingLight.props.button.props.state,
};

export const properties = {
  ceilingLight: devices.ceilingLight.props.relay,
  door: new Element({
    level: Level.AREA as const,
    open: devices.doorSensor.props.open,
  }),
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
    properties.ceilingLight.props.flip.props.state.trigger()
  );

  instances.wallswitch.longPress(async () => {
    if (!properties.lightTimer.props.main.props.state.value) return;

    indicatorInProgress = true;

    if (properties.ceilingLight.props.main.props.setState.value) {
      await ackBlinkFromOn(properties.ceilingLight.props.main.props.setState);
    } else {
      await ackBlinkFromOff(properties.ceilingLight.props.main.props.setState);
    }

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
  devices: new Element({ ...devices, level: Level.NONE as const }),
  ...groups,
  ...properties,
  level: Level.ROOM as const,
});
