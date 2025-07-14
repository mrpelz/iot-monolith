/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Ev1527Device } from '../../device/ev1527.js';
import { Ev1527WindowSensor } from '../../events/ev1527-window-sensor.js';
import { MultiValueEvent } from '../../items/event.js';
import { Observable, ReadOnlyProxyObservable } from '../../observable.js';
import { Ev1527Transport } from '../../transport/ev1527.js';
import { Context } from '../context.js';
import { ev1527Device } from '../elements/device.js';
import { getter } from '../elements/getter.js';
import { Level, ValueType } from '../main.js';
import { InitFunction } from '../operations/init.js';
import { Metrics } from '../operations/metrics.js';
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

  const persistedOpen = new Observable<boolean | null>(null);
  const isOpen = new ReadOnlyProxyObservable(receivedOpen, (input) =>
    input === null ? persistedOpen.value : input,
  );
  const isReceivedValue = new ReadOnlyProxyObservable(
    receivedOpen,
    (input) => input !== null,
  );

  const $initOpen: InitFunction = (self, introspection) => {
    const { mainReference } = introspection.getObject(self) ?? {};
    if (!mainReference) return;

    persistence.observe(mainReference.pathString, persistedOpen);

    const labels = Metrics.hierarchyLabels(introspection, self);
    if (!labels) return;

    context.metrics.addMetric(
      'open',
      'state door/window sensor',
      isOpen,
      labels,
    );

    context.metrics.addMetric(
      'open_received',
      'state door/window sensor',
      isReceivedValue,
      labels,
    );
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

    const labels = Metrics.hierarchyLabels(introspection, self);
    if (!labels) return;

    context.metrics.addMetric(
      'open_tamperSwitch',
      'state door/window sensor tamper switch',
      tamperSwitch,
      labels,
    );
  };

  receivedOpen.observe((value) => {
    if (value === null) return;

    persistedOpen.value = value;
  });

  return {
    internal: {
      $exclude: true as const,
      $noMainReference: true as const,
      open: {
        $init: $initOpen,
        isReceivedValue: getter(ValueType.BOOLEAN, isReceivedValue),
        level: Level.PROPERTY as const,
        main: getter(ValueType.BOOLEAN, isOpen),
        tamperSwitch: {
          $init: $initTamperSwitch,
          main: getter(ValueType.BOOLEAN, tamperSwitch),
          ...lastChange(context, receivedTamperSwitch),
        },
        ...lastChange(context, receivedOpen),
      },
    },
    ...ev1527Device(context, device),
  };
};
