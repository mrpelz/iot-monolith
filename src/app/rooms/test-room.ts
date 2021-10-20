/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import {
  BooleanGroupStrategy,
  combineBooleanState,
} from '../../lib/state-group.js';
import { BooleanState, NullState } from '../../lib/state.js';
import {
  Levels,
  ParentRelation,
  ValueType,
  inherit,
  metadataStore,
} from '../../lib/tree.js';
import { espNowTransport, ev1527Transport } from '../bridges.js';
import { Logger } from '../../lib/log.js';
import { ReadOnlyObservable } from '../../lib/observable.js';
import { Timer } from '../../lib/timer.js';
import { espNowButton } from '../../lib/groupings/esp-now-button.js';
import { espNowWindowSensor } from '../../lib/groupings/esp-now-window-sensor.js';
import { ev1527ButtonX1 } from '../../lib/groupings/ev1527-button.js';
import { h801 } from '../../lib/groupings/h801.js';
import { obiPlug } from '../../lib/groupings/obi-plug.js';
import { shelly1 } from '../../lib/groupings/shelly1.js';
import { shellyi3 } from '../../lib/groupings/shelly-i3.js';
import { sonoffBasic } from '../../lib/groupings/sonoff-basic.js';
import { testDevice } from '../../lib/groupings/test-device.js';
import { timings } from '../timings.js';

export function testRoom(logger: Logger) {
  const nodes = {
    blueButton: ev1527ButtonX1(ev1527Transport, 74160, logger),
    espNowButton: espNowButton(logger, timings, {
      espNow: {
        // prettier-ignore
        macAddress: [0x70, 0x3, 0x9f, 0x7, 0x83, 0xdf],
        transport: espNowTransport,
      },
      wifi: {
        host: 'esp-now-test-button.iot-ng.lan.wurstsalat.cloud',
      },
    }),
    espNowWindowSensor: espNowWindowSensor(logger, timings, {
      espNow: {
        // prettier-ignore
        macAddress: [0xdc, 0x4f, 0x22, 0x57, 0xe7, 0xf0],
        transport: espNowTransport,
      },
      wifi: {
        host: 'esp-now-test-window-sensor.iot-ng.lan.wurstsalat.cloud',
      },
    }),
    grayButton: ev1527ButtonX1(ev1527Transport, 4448, logger),
    h801: h801(logger, timings, 'h801.iot-ng.lan.wurstsalat.cloud'),
    obiPlug: obiPlug(logger, timings, 'obi-jack.iot-ng.lan.wurstsalat.cloud'),
    orangeButton: ev1527ButtonX1(ev1527Transport, 307536, logger),
    shelly1: shelly1(logger, timings, 'shelly1.iot-ng.lan.wurstsalat.cloud'),
    shellyi3: shellyi3(
      logger,
      timings,
      'shelly-i3.iot-ng.lan.wurstsalat.cloud'
    ),
    sonoffBasic: sonoffBasic(
      logger,
      timings,
      'sonoff-basic.iot-ng.lan.wurstsalat.cloud'
    ),
    testDevice: testDevice(logger, timings),
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

  nodes.espNowButton.wifi.button0.$.shortPress(() => on.flip());
  nodes.espNowButton.wifi.button1.$.shortPress(() => on.flip());
  nodes.espNowButton.espNow.button0.$.shortPress(() => on.flip());
  nodes.espNowButton.espNow.button1.$.shortPress(() => on.flip());

  nodes.shelly1.button.$.shortPress(() => on.flip());

  nodes.shellyi3.button0.$.shortPress(() => on.flip());
  nodes.shellyi3.button1.$.shortPress(() => on.flip());
  nodes.shellyi3.button2.$.shortPress(() => on.flip());

  nodes.sonoffBasic.button.$.shortPress(() => on.flip());

  nodes.blueButton.$.observe(() => on.flip());
  nodes.grayButton.$.observe(() => on.flip());
  nodes.orangeButton.$.observe(() => on.flip());

  on.observe((value) => {
    nodes.obiPlug.relay._set.value = value;
    nodes.shelly1.relay._set.value = value;
    nodes.sonoffBasic.relay._set.value = value;
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
          actuated: inherit,
          level: Levels.PROPERTY,
          parentRelation: ParentRelation.CONTROL_TRIGGER,
          type: 'actuator',
          valueType: ValueType.NULL,
        });

        return _flip;
      })(),
      off: (() => {
        const _off = {
          _set: new NullState(() => (on.value = false)),
        };

        metadataStore.set(_off, {
          actuated: inherit,
          level: Levels.PROPERTY,
          parentRelation: ParentRelation.CONTROL_TRIGGER,
          type: 'actuator',
          valueType: ValueType.NULL,
        });

        return _off;
      })(),
      on: (() => {
        const _on = {
          _set: new NullState(() => (on.value = true)),
        };

        metadataStore.set(_on, {
          actuated: inherit,
          level: Levels.PROPERTY,
          parentRelation: ParentRelation.CONTROL_TRIGGER,
          type: 'actuator',
          valueType: ValueType.NULL,
        });

        return _on;
      })(),
    };

    metadataStore.set(_light, {
      actuated: 'light',
      level: Levels.PROPERTY,
      type: 'actuator',
      valueType: ValueType.BOOLEAN,
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
    isDaylit: true,
    level: Levels.ROOM,
    name: 'testRoom',
  });

  return result;
}
