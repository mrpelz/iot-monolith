/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Ev1527Device } from '../../device/ev1527.js';
import { Ev1527WindowSensor } from '../../events/ev1527-window-sensor.js';
import { MultiValueEvent } from '../../items/event.js';
import {
  Observable,
  ReadOnlyObservable,
  ReadOnlyProxyObservable,
} from '../../observable.js';
import { Ev1527Transport } from '../../transport/ev1527.js';
import { Context } from '../context.js';
import { ev1527Device } from '../elements/device.js';
import { getter } from '../elements/getter.js';
import { Level, ValueType } from '../main.js';
import { InitFunction } from '../operations/init.js';
import { lastChange } from '../properties/sensors.js';

export const ev1527WindowSensor = (
  address: number,
  transport: Ev1527Transport,
  context: Context,
) => {
  const { logger, persistence } = context;

  const device = new Ev1527Device(logger, transport, address);

  const { open: receivedOpen, tamperSwitch: receivedTamperSwitch } =
    new MultiValueEvent(device.addEvent(new Ev1527WindowSensor()), [
      'open',
      'tamperSwitch',
    ]).state;

  const isOpen_ = new Observable<boolean | null>(receivedOpen.value);
  receivedOpen.observe((value) => {
    if (value === null) return;

    isOpen_.value = value;
  });

  const persistedOpen = new Observable<boolean | null>(null, (value) => {
    if (value === null) return;
    if (isOpen_.value !== null) return;

    isOpen_.value = value;
  });

  const isOpen = new ReadOnlyObservable(isOpen_);

  const isReceivedValue = new ReadOnlyProxyObservable(
    receivedOpen,
    (input) => input !== null,
  );

  const $initOpen: InitFunction = (self, introspection) => {
    const { mainReference } = introspection.getObject(self) ?? {};
    if (!mainReference) return;

    persistence.observe(mainReference.pathString, persistedOpen);
  };

  const persistedTamperSwitch = new Observable<boolean | null>(null);
  receivedTamperSwitch.observe((value) => {
    if (value === null) return;

    persistedTamperSwitch.value = value;
  });
  const tamperSwitch = new ReadOnlyProxyObservable(
    receivedTamperSwitch,
    (input) => (input === null ? persistedTamperSwitch.value : input),
  );

  const $initTamperSwitch: InitFunction = (self, introspection) => {
    const { mainReference } = introspection.getObject(self) ?? {};
    if (!mainReference) return;

    persistence.observe(mainReference.pathString, persistedTamperSwitch);
  };

  receivedOpen.observe((value) => {
    if (value === null) return;

    persistedOpen.value = value;
  });

  return {
    $noMainReference: true as const,
    device: ev1527Device(context, device),
    open: {
      $init: $initOpen,
      isReceivedValue: {
        main: getter(ValueType.BOOLEAN, isReceivedValue),
        state: isReceivedValue,
      },
      lastChange: lastChange(context, receivedOpen),
      level: Level.PROPERTY as const,
      main: getter(ValueType.BOOLEAN, isOpen),
      state: isOpen,
      tamperSwitch: {
        $init: $initTamperSwitch,
        lastChange: lastChange(context, receivedTamperSwitch),
        main: getter(ValueType.BOOLEAN, tamperSwitch),
        state: tamperSwitch,
      },
    },
  };
};
