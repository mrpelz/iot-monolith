/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Levels, ValueType, inherit, metadataStore } from '../main.js';
import {
  Observable,
  ReadOnlyObservable,
  ReadOnlyProxyObservable,
} from '../../observable.js';
import { lastChange, lastSeen } from '../properties/sensors.js';
import { Ev1527Device } from '../../device/ev1527.js';
import { Ev1527Transport } from '../../transport/ev1527.js';
import { Ev1527WindowSensor } from '../../events/ev1527-window-sensor.js';
import { Logger } from '../../log.js';
import { MultiValueEvent } from '../../items/event.js';
import { Persistence } from '../../persistence.js';
import { deviceMeta } from './utils.js';

export const ev1527WindowSensor = (
  logger: Logger,
  persistence: Persistence,
  transport: Ev1527Transport,
  address: number
) => {
  const device = new Ev1527Device(logger, transport, address);

  const { open: receivedOpen, tamperSwitch } = new MultiValueEvent(
    device.addEvent(new Ev1527WindowSensor()),
    ['open', 'tamperSwitch']
  ).state;

  const persistedOpen = new Observable<boolean | null>(null);
  persistence.observe(`ev1527WindowSensor/${address}/open`, persistedOpen);

  receivedOpen.observe((value) => {
    if (value === null) return;

    persistedOpen.value = value;
  });

  const open = new ReadOnlyProxyObservable(receivedOpen, (input) => {
    return input === null ? persistedOpen.value : input;
  });

  const result = {
    open: (() => {
      const _open = {
        _get: open,
        persistedOpen: (() => {
          const _persistedOpen = {
            _get: new ReadOnlyObservable(persistedOpen),
          };

          metadataStore.set(_persistedOpen, {
            level: Levels.PROPERTY,
            measured: inherit,
            type: 'sensor',
            valueType: ValueType.BOOLEAN,
          });

          return _persistedOpen;
        })(),
        receivedOpen: (() => {
          const _receivedOpen = {
            _get: receivedOpen,
          };

          metadataStore.set(_receivedOpen, {
            level: Levels.PROPERTY,
            measured: inherit,
            type: 'sensor',
            valueType: ValueType.BOOLEAN,
          });

          return _receivedOpen;
        })(),
        tamperSwitch: (() => {
          const _tamperSwitch = {
            _get: tamperSwitch,
            ...lastSeen(tamperSwitch),
          };

          metadataStore.set(_tamperSwitch, {
            level: Levels.PROPERTY,
            measured: 'tamperSwitch',
            type: 'sensor',
            valueType: ValueType.BOOLEAN,
          });

          return _tamperSwitch;
        })(),
        ...lastChange(receivedOpen),
      };

      metadataStore.set(_open, {
        level: Levels.PROPERTY,
        measured: 'open',
        type: 'sensor',
        valueType: ValueType.BOOLEAN,
      });

      return _open;
    })(),
    ...lastSeen(device.seen),
  };

  metadataStore.set(result, {
    ...deviceMeta(device),
  });

  return result;
};
