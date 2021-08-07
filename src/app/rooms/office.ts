/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import {
  BooleanGroupStrategy,
  combineBooleanState,
} from '../../lib/state-group.js';
import { BooleanState, NullState } from '../../lib/state.js';
import { espNowTransport, ev1527Transport } from '../bridges.js';
import { Logger } from '../../lib/log.js';
import { ReadOnlyObservable } from '../../lib/observable.js';
import { Timer } from '../../lib/timer.js';
import { espNowButton } from '../../lib/groupings/esp-now-button.js';
import { espNowWindowSensor } from '../../lib/groupings/esp-now-window-sensor.js';
import { ev1527ButtonX1 } from '../../lib/groupings/ev1527-button.js';
import { ev1527WindowSensor } from '../../lib/groupings/ev1527-window-sensor.js';
import { h801 } from '../../lib/groupings/h801.js';
import { metadataStore } from '../../lib/hierarchy.js';
import { obiPlug } from '../../lib/groupings/obi-plug.js';
import { shellyi3 } from '../../lib/groupings/shelly-i3.js';
import { testDevice } from '../../lib/groupings/test-device.js';
import { timings } from '../timings.js';

export function office(logger: Logger) {
  const nodes = {
    blueButton: ev1527ButtonX1(ev1527Transport, 74160, logger),
    espNowButton: espNowButton(logger, timings, {
      espNow: {
        // prettier-ignore
        macAddress: [0x70, 0x3, 0x9f, 0x7, 0x83, 0xdf],
        transport: espNowTransport,
      },
      wifi: {
        host: 'esp-now-test-button.iot-ng.net.wurstsalat.cloud',
      },
    }),
    espNowWindowSensor: espNowWindowSensor(logger, timings, {
      espNow: {
        // prettier-ignore
        macAddress: [0xdc, 0x4f, 0x22, 0x57, 0xe7, 0xf0],
        transport: espNowTransport,
      },
      wifi: {
        host: 'esp-now-test-window-sensor.iot-ng.net.wurstsalat.cloud',
      },
    }),
    grayButton: ev1527ButtonX1(ev1527Transport, 4448, logger),
    h801: h801(logger, timings, 'h801.iot-ng.net.wurstsalat.cloud'),
    obiPlug: obiPlug(logger, timings, 'obi-jack.iot-ng.net.wurstsalat.cloud'),
    orangeButton: ev1527ButtonX1(ev1527Transport, 307536, logger),
    shellyi3: shellyi3(
      logger,
      timings,
      'shelly-i3.iot-ng.net.wurstsalat.cloud'
    ),
    testDevice: testDevice(logger, timings),
    windowSensor: ev1527WindowSensor(logger, ev1527Transport, 839280),
  };

  const on = new BooleanState(false);

  const timedOn = new BooleanState(false);
  const timer = new Timer(10000);

  timedOn.observe((value) => {
    if (!value) return;
    timer.start();
  });
  timer.observe(() => (timedOn.value = false));

  const ledOn = combineBooleanState(
    BooleanGroupStrategy.IS_TRUE_IF_SOME_TRUE,
    false,
    on,
    timedOn
  );

  nodes.testDevice.motion._get.observe((motion) => {
    if (!motion) return;
    timedOn.value = true;
  });

  nodes.obiPlug.button.$.shortPress(() => on.flip());

  nodes.shellyi3.button0.$.shortPress(() => on.flip());
  nodes.shellyi3.button1.$.shortPress(() => on.flip());
  nodes.shellyi3.button2.$.shortPress(() => on.flip());

  nodes.blueButton.$.observe(() => on.flip());
  nodes.grayButton.$.observe(() => on.flip());
  nodes.orangeButton.$.observe(() => on.flip());

  on.observe((value) => {
    nodes.obiPlug.relay._set.value = value;
  });

  ledOn.observe((value) => {
    nodes.h801.led0._set.value = value;
    nodes.h801.led1._set.value = value;
    nodes.h801.led2._set.value = value;
    nodes.h801.led3._set.value = value;
    nodes.h801.led4._set.value = value;
  });

  const {
    brightness,
    co2,
    humidity,
    motion,
    pm025,
    pm10,
    pressure,
    temperature,
    uvIndex,
  } = nodes.testDevice;

  const light = (() => {
    const _light = {
      _get: new ReadOnlyObservable(on),
      _set: on,
      flip: (() => {
        const _flip = {
          _set: new NullState(() => on.flip()),
        };

        metadataStore.set(_flip, {
          type: 'null',
        });

        return _flip;
      })(),
      off: (() => {
        const _off = {
          _set: new NullState(() => (on.value = false)),
        };

        metadataStore.set(_off, {
          type: 'null',
        });

        return _off;
      })(),
      on: (() => {
        const _on = {
          _set: new NullState(() => (on.value = true)),
        };

        metadataStore.set(_on, {
          type: 'null',
        });

        return _on;
      })(),
    };

    metadataStore.set(_light, {
      actuator: 'virtual',
      type: 'boolean',
    });

    return _light;
  })();

  const result = {
    ...nodes,
    brightness,
    co2,
    humidity,
    light,
    motion,
    pm025,
    pm10,
    pressure,
    temperature,
    uvIndex,
  };

  metadataStore.set(result, {
    name: 'office',
  });

  return result;
}
