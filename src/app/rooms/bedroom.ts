/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Levels, metadataStore } from '../../lib/tree/main.js';
import { ModifiableDate, Unit } from '../../lib/modifiable-date.js';
import {
  ev1527ButtonX1,
  ev1527ButtonX4,
} from '../../lib/tree/devices/ev1527-button.js';
import {
  ledGrouping,
  outputGrouping,
} from '../../lib/tree/properties/actuators.js';
import { Schedule } from '../../lib/schedule.js';
import { epochs } from '../../lib/epochs.js';
import { ev1527Transport } from '../bridges.js';
import { ev1527WindowSensor } from '../../lib/tree/devices/ev1527-window-sensor.js';
import { h801 } from '../../lib/tree/devices/h801.js';
import { logger } from '../logging.js';
import { obiPlug } from '../../lib/tree/devices/obi-plug.js';
import { persistence } from '../persistence.js';
import { scheduledRamp } from '../../lib/tree/properties/logic.js';
import { shelly1 } from '../../lib/tree/devices/shelly1.js';
import { shellyi3 } from '../../lib/tree/devices/shelly-i3.js';
import { timings } from '../timings.js';

export const devices = {
  ceilingLight: shelly1(
    logger,
    persistence,
    timings,
    'lighting',
    'bedroom-ceilinglight.iot.wurstsalat.cloud'
  ),
  doorSensor: ev1527WindowSensor(
    logger,
    persistence,
    ev1527Transport,
    724720,
    'doorOpen'
  ),
  nightstandButtonLeft: ev1527ButtonX1(ev1527Transport, 74160, logger),
  nightstandButtonRight: ev1527ButtonX1(ev1527Transport, 4448, logger),
  nightstandLeds: h801(
    logger,
    persistence,
    timings,
    'bedroom-nightstandleds.iot.wurstsalat.cloud'
  ),
  nightstandMultiButtonLeft: ev1527ButtonX4(ev1527Transport, 831834, logger),
  nightstandMultiButtonRight: ev1527ButtonX4(ev1527Transport, 714410, logger),
  rgbwLeds: h801(
    logger,
    persistence,
    timings,
    'bedroom-bedrgbwleds.iot.wurstsalat.cloud'
  ),
  stoneLamp: obiPlug(
    logger,
    persistence,
    timings,
    'lighting',
    'bedroom-stonelamp.iot.wurstsalat.cloud'
  ),
  wallswitchDoor: shellyi3(
    logger,
    timings,
    'bedroom-wallswitchdoor.iot.wurstsalat.cloud'
  ),
  windowSensorLeft: ev1527WindowSensor(
    logger,
    persistence,
    ev1527Transport,
    762272
  ),
  // windowSensorRight: ev1527WindowSensor(logger, ev1527Transport, 0),
};

export const instances = {
  nightstandButtonLeft: devices.nightstandButtonLeft.$,
  nightstandButtonRight: devices.nightstandButtonRight.$,
  nightstandMultiButtonLeft: devices.nightstandMultiButtonLeft.$,
  nightstandMultiButtonRight: devices.nightstandMultiButtonRight.$,
  stoneLampButton: devices.stoneLamp.button.$,
  wallswitchBed: devices.ceilingLight.button.$,
  wallswitchDoorLeft: devices.wallswitchDoor.button0.$,
  wallswitchDoorMiddle: devices.wallswitchDoor.button1.$,
  wallswitchDoorRight: devices.wallswitchDoor.button2.$,
};

const partialProperties = {
  bedLedB: devices.rgbwLeds.ledB,
  bedLedDownlightRed: devices.nightstandLeds.ledB,
  bedLedG: devices.rgbwLeds.ledG,
  bedLedR: devices.rgbwLeds.ledR,
  bedLedW: devices.rgbwLeds.ledW1,
  ceilingLight: devices.ceilingLight.relay,
  door: devices.doorSensor.open,
  nightstandLedLeft: devices.nightstandLeds.ledR,
  nightstandLedRight: devices.nightstandLeds.ledG,
  stoneLamp: devices.stoneLamp.relay,
  windowLeft: devices.windowSensorLeft.open,
  // windowRight: devices.windowSensorRight.open,
  // windowRightSensorTampered: devices.windowSensorRight.tamperSwitch,
};

export const groups = {
  allLights: outputGrouping([
    partialProperties.bedLedR,
    partialProperties.bedLedG,
    partialProperties.bedLedB,
    partialProperties.bedLedW,
    partialProperties.ceilingLight,
    partialProperties.nightstandLedLeft,
    partialProperties.nightstandLedRight,
    partialProperties.bedLedDownlightRed,
    partialProperties.stoneLamp,
  ]),
  fuckLight: outputGrouping([
    partialProperties.bedLedDownlightRed,
    partialProperties.bedLedR,
  ]),
  leds: ledGrouping([
    partialProperties.bedLedR,
    partialProperties.bedLedG,
    partialProperties.bedLedB,
    partialProperties.bedLedW,
    partialProperties.nightstandLedLeft,
    partialProperties.nightstandLedRight,
    partialProperties.bedLedDownlightRed,
  ]),
  nightstandLeds: ledGrouping([
    partialProperties.nightstandLedLeft,
    partialProperties.nightstandLedRight,
  ]),
  whiteLeds: ledGrouping([
    partialProperties.bedLedW,
    partialProperties.nightstandLedLeft,
    partialProperties.nightstandLedRight,
  ]),
};

export const properties = {
  ...partialProperties,
  wakeupLightWeekday: scheduledRamp(
    [
      new Schedule(
        logger,
        () => {
          const result = new ModifiableDate().truncateToNext(Unit.MINUTE);

          const advance = () => {
            result.forwardUntil({
              [Unit.HOUR]: 7,
              [Unit.MINUTE]: 0,
            });
          };

          advance();

          while (result.isWeekend) {
            advance();
          }

          return result.date;
        },
        false
      ),
      epochs.hour,
    ],
    epochs.second * 10,
    (progress) => {
      groups.whiteLeds.brightness._set.value = progress;
      if (progress === 1) partialProperties.ceilingLight._set.value = true;
    },
    ['bedroom/wakeupLightWeekday', persistence]
  ),
  wakeupLightWeekend: scheduledRamp(
    [
      new Schedule(
        logger,
        () => {
          const result = new ModifiableDate().truncateToNext(Unit.MINUTE);

          const advance = () => {
            result.forwardUntil({
              [Unit.HOUR]: 8,
              [Unit.MINUTE]: 0,
            });
          };

          advance();

          while (result.isWeekday) {
            advance();
          }

          return result.date;
        },
        false
      ),
      epochs.hour,
    ],
    epochs.second * 10,
    (progress) => {
      groups.whiteLeds.brightness._set.value = progress;
      if (progress === 1) partialProperties.ceilingLight._set.value = true;
    },
    ['bedroom/wakeupLightWeekend', persistence]
  ),
};

(() => {
  instances.nightstandButtonLeft.observe(() => {
    if (groups.allLights._get.value) {
      groups.allLights._set.value = false;
      return;
    }

    properties.nightstandLedLeft.brightness._set.value = 0.3;
  });

  instances.nightstandButtonRight.observe(() => {
    if (groups.allLights._get.value) {
      groups.allLights._set.value = false;
      return;
    }

    properties.nightstandLedRight.brightness._set.value = 0.3;
  });

  instances.nightstandMultiButtonLeft.topLeft.observe(() =>
    groups.whiteLeds._set.flip()
  );
  instances.nightstandMultiButtonLeft.topRight.observe(() =>
    groups.fuckLight._set.flip()
  );
  instances.nightstandMultiButtonLeft.bottomLeft.observe(() =>
    properties.bedLedG._set.flip()
  );
  instances.nightstandMultiButtonLeft.bottomRight.observe(() =>
    properties.bedLedB._set.flip()
  );

  instances.nightstandMultiButtonRight.topLeft.observe(() =>
    groups.whiteLeds._set.flip()
  );
  instances.nightstandMultiButtonRight.topRight.observe(() =>
    groups.fuckLight._set.flip()
  );
  instances.nightstandMultiButtonRight.bottomLeft.observe(() =>
    properties.bedLedG._set.flip()
  );
  instances.nightstandMultiButtonRight.bottomRight.observe(() =>
    properties.bedLedB._set.flip()
  );

  instances.wallswitchBed.up(() => {
    if (groups.allLights._get.value) {
      groups.allLights._set.value = false;
      return;
    }

    properties.ceilingLight._set.flip();
  });
  instances.wallswitchBed.longPress(
    () => (groups.allLights._set.value = false)
  );

  instances.stoneLampButton.up(() => properties.stoneLamp._set.flip());
  instances.stoneLampButton.longPress(
    () => (groups.allLights._set.value = false)
  );

  instances.wallswitchDoorLeft.up(() => groups.whiteLeds._set.flip());
  instances.wallswitchDoorLeft.longPress(
    () => (groups.allLights._set.value = false)
  );

  instances.wallswitchDoorMiddle.up(() => properties.ceilingLight._set.flip());
  instances.wallswitchDoorMiddle.longPress(
    () => (groups.allLights._set.value = false)
  );

  instances.wallswitchDoorRight.up(() => groups.fuckLight._set.flip());
  instances.wallswitchDoorRight.longPress(
    () => (groups.allLights._set.value = false)
  );
})();

export const bedroom = {
  devices,
  ...groups,
  ...properties,
};

metadataStore.set(bedroom, {
  isDaylit: true,
  level: Levels.ROOM,
  name: 'bedroom',
});
