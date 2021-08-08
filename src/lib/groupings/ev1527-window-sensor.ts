/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Ev1527Device } from '../device/ev1527.js';
import { Ev1527Transport } from '../transport/ev1527.js';
import { Ev1527WindowSensor } from '../events/ev1527-window-sensor.js';
import { Logger } from '../log.js';
import { MultiValueEvent } from '../items/event.js';
import { metadataStore } from '../tree.js';

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
      };

      metadataStore.set(_open, {
        metric: 'window-open',
        type: 'boolean',
      });

      return _open;
    })(),
    tamperSwitch: (() => {
      const _tamperSwitch = {
        _get: tamperSwitch,
      };

      metadataStore.set(_tamperSwitch, {
        metric: 'window-tamper-switch',
        type: 'boolean',
      });

      return _tamperSwitch;
    })(),
  };

  metadataStore.set(result, {
    name: 'ev1527-window-sensor',
  });

  return result;
};
