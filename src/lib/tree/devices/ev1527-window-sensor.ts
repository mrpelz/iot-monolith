/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import {
  Levels,
  ParentRelation,
  ValueType,
  inherit,
  metadataStore,
} from '../main.js';
import { Observable, ReadOnlyProxyObservable } from '../../observable.js';
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
  address: number,
  measured = 'windowOpen'
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

  const open = new ReadOnlyProxyObservable(receivedOpen, (input) => {
    return input === null ? persistedOpen.value : input;
  });

  const tamperSwitch = new ReadOnlyProxyObservable(
    receivedTamperSwitch,
    (input) => {
      return input === null ? persistedTamperSwitch.value : input;
    }
  );

  const isReceivedValue = new ReadOnlyProxyObservable(
    receivedOpen,
    (input) => input !== null
  );

  const result = {
    open: (() => {
      const _open = {
        _get: open,
        isReceivedValue: (() => {
          const _isReceivedValue = {
            _get: isReceivedValue,
          };

          metadataStore.set(_isReceivedValue, {
            level: Levels.PROPERTY,
            measured: inherit,
            parentRelation: ParentRelation.DATA_QUALIFIER,
            type: 'sensor',
            valueType: ValueType.BOOLEAN,
          });

          return _isReceivedValue;
        })(),
        tamperSwitch: (() => {
          const _tamperSwitch = {
            _get: tamperSwitch,
            ...lastSeen(receivedTamperSwitch),
          };

          metadataStore.set(_tamperSwitch, {
            level: Levels.PROPERTY,
            measured: 'tamperSwitch',
            parentRelation: ParentRelation.DATA_QUALIFIER,
            type: 'sensor',
            valueType: ValueType.BOOLEAN,
          });

          return _tamperSwitch;
        })(),
        ...lastChange(receivedOpen),
      };

      metadataStore.set(_open, {
        level: Levels.PROPERTY,
        measured,
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
