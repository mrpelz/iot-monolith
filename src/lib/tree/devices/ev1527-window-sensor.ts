/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Element, Level, ValueType } from '../main.js';
import { Observable, ReadOnlyProxyObservable } from '../../observable.js';
import { Ev1527Device } from '../../device/ev1527.js';
import { Ev1527Transport } from '../../transport/ev1527.js';
import { Ev1527WindowSensor } from '../../events/ev1527-window-sensor.js';
import { Logger } from '../../log.js';
import { MultiValueEvent } from '../../items/event.js';
import { Persistence } from '../../persistence.js';
import { ev1527Device } from '../elements/device.js';
import { getter } from '../elements/getter.js';
import { lastChange } from '../properties/sensors.js';

export const ev1527WindowSensor = (
  logger: Logger,
  persistence: Persistence,
  transport: Ev1527Transport,
  address: number
) => {
  const device = new Ev1527Device(logger, transport, address);

  const { open: receivedOpen, tamperSwitch: receivedTamperSwitch } =
    new MultiValueEvent(device.addEvent(new Ev1527WindowSensor()), [
      'open',
      'tamperSwitch',
    ]).state;

  const persistedOpen = new Observable<boolean | null>(null);
  persistence.observe(`ev1527WindowSensor/${address}/open`, persistedOpen);

  const persistedTamperSwitch = new Observable<boolean | null>(null);
  persistence.observe(
    `ev1527WindowSensor/${address}/tamperSwitch`,
    persistedTamperSwitch
  );

  receivedOpen.observe((value) => {
    if (value === null) return;

    persistedOpen.value = value;
  });

  receivedTamperSwitch.observe((value) => {
    if (value === null) return;

    persistedTamperSwitch.value = value;
  });

  const isOpen = new ReadOnlyProxyObservable(receivedOpen, (input) =>
    input === null ? persistedOpen.value : input
  );

  const tamperSwitch = new ReadOnlyProxyObservable(
    receivedTamperSwitch,
    (input) => (input === null ? persistedTamperSwitch.value : input)
  );

  const isReceivedValue = new ReadOnlyProxyObservable(
    receivedOpen,
    (input) => input !== null
  );

  return new Element({
    ...ev1527Device(device),
    internal: {
      open: new Element({
        ...lastChange(receivedOpen),
        isReceivedValue: getter(ValueType.BOOLEAN, isReceivedValue),
        level: Level.PROPERTY as const,
        main: getter(ValueType.BOOLEAN, isOpen),
        tamperSwitch: new Element({
          ...lastChange(receivedTamperSwitch),
          main: getter(ValueType.BOOLEAN, tamperSwitch),
        }),
      }),
    },
  });
};
