/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Levels, addMeta } from '../../lib/tree/main.js';
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
import { inputGrouping } from '../../lib/tree/properties/sensors.js';
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
    'bedroom-ceilinglight.lan.wurstsalat.cloud'
  ),
  doorSensor: ev1527WindowSensor(logger, persistence, ev1527Transport, 724720),
  nightstandButtonLeft: ev1527ButtonX1(ev1527Transport, 74160, logger),
  nightstandButtonRight: ev1527ButtonX1(ev1527Transport, 4448, logger),
  nightstandLeds: h801(
    logger,
    persistence,
    timings,
    'bedroom-nightstandleds.lan.wurstsalat.cloud'
  ),
  nightstandMultiButtonLeft: ev1527ButtonX4(ev1527Transport, 831834, logger),
  nightstandMultiButtonRight: ev1527ButtonX4(ev1527Transport, 714410, logger),
  rgbwLeds: h801(
    logger,
    persistence,
    timings,
    'bedroom-bedrgbwleds.lan.wurstsalat.cloud'
  ),
  stoneLamp: obiPlug(
    logger,
    persistence,
    timings,
    'lighting',
    'bedroom-stonelamp.lan.wurstsalat.cloud'
  ),
  wallswitchDoor: shellyi3(
    logger,
    persistence,
    timings,
    'bedroom-wallswitchdoor.lan.wurstsalat.cloud'
  ),
  wardrobeButton: ev1527ButtonX1(ev1527Transport, 374680, logger),
  windowSensorLeft: ev1527WindowSensor(
    logger,
    persistence,
    ev1527Transport,
    762272
  ),
  // windowSensorRight: ev1527WindowSensor(logger, persistence, ev1527Transport, 0),
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
  wardrobeButton: devices.wardrobeButton.$,
};

const partialProperties = {
  bedLedDownlightRed: devices.nightstandLeds.ledB,
  bedLedRGB: addMeta(
    {
      b: devices.rgbwLeds.ledB,
      g: devices.rgbwLeds.ledG,
      r: devices.rgbwLeds.ledR,
    },
    { level: Levels.AREA }
  ),
  bedLedW: devices.rgbwLeds.ledW1,
  ceilingLight: devices.ceilingLight.relay,
  door: addMeta({ open: devices.doorSensor.open }, { level: Levels.AREA }),
  nightstandLedLeft: devices.nightstandLeds.ledR,
  nightstandLedRight: devices.nightstandLeds.ledG,
  stoneLamp: devices.stoneLamp.relay,
  windowLeft: addMeta(
    { open: devices.windowSensorLeft.open },
    { level: Levels.AREA, name: 'window' }
  ),
  // windowRight: devices.windowSensorRight.open,
  // windowRightSensorTampered: devices.windowSensorRight.tamperSwitch,
};

export const groups = {
  allLights: outputGrouping([
    partialProperties.bedLedRGB.r,
    partialProperties.bedLedRGB.g,
    partialProperties.bedLedRGB.b,
    partialProperties.bedLedW,
    partialProperties.ceilingLight,
    partialProperties.nightstandLedLeft,
    partialProperties.nightstandLedRight,
    partialProperties.bedLedDownlightRed,
    partialProperties.stoneLamp,
  ]),
  allWindows: inputGrouping(partialProperties.windowLeft.open._get),
  fuckLight: outputGrouping([
    partialProperties.bedLedDownlightRed,
    partialProperties.bedLedRGB.r,
  ]),
  leds: ledGrouping([
    partialProperties.bedLedRGB.r,
    partialProperties.bedLedRGB.g,
    partialProperties.bedLedRGB.b,
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
      if (progress === 0) partialProperties.ceilingLight._set.value = false;
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
      if (progress === 0) partialProperties.ceilingLight._set.value = false;
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
    properties.bedLedRGB.g._set.flip()
  );
  instances.nightstandMultiButtonLeft.bottomRight.observe(() =>
    properties.bedLedRGB.b._set.flip()
  );

  instances.nightstandMultiButtonRight.topLeft.observe(() =>
    groups.whiteLeds._set.flip()
  );
  instances.nightstandMultiButtonRight.topRight.observe(() =>
    groups.fuckLight._set.flip()
  );
  instances.nightstandMultiButtonRight.bottomLeft.observe(() =>
    properties.bedLedRGB.g._set.flip()
  );
  instances.nightstandMultiButtonRight.bottomRight.observe(() =>
    properties.bedLedRGB.b._set.flip()
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

  instances.wardrobeButton.observe(() => {
    if (groups.allLights._get.value) {
      groups.allLights._set.value = false;
      return;
    }

    properties.ceilingLight._set.flip();
  });
})();

export const bedroom = addMeta(
  {
    devices,
    ...groups,
    ...properties,
  },
  {
    isDaylit: true,
    level: Levels.ROOM,
    name: 'bedroom',
  }
);
