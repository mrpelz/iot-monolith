/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Levels, ValueType, metadataStore } from '../main.js';
import { lastChange, lastSeen } from '../properties/sensors.js';
import { Ev1527Device } from '../../device/ev1527.js';
import { Ev1527Transport } from '../../transport/ev1527.js';
import { Ev1527WindowSensor } from '../../events/ev1527-window-sensor.js';
import { Logger } from '../../log.js';
import { MultiValueEvent } from '../../items/event.js';
import { deviceMeta } from './utils.js';

export const ev1527WindowSensor = (
  logger: Logger,
  transport: Ev1527Transport,
  address: number
) => {
  const device = new Ev1527Device(logger, transport, address);

  const { open, tamperSwitch } = new MultiValueEvent(
    device.addEvent(new Ev1527WindowSensor()),
    ['open', 'tamperSwitch']
  ).state;

  const result = {
    open: (() => {
      const _open = {
        _get: open,
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
        ...lastChange(open),
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
