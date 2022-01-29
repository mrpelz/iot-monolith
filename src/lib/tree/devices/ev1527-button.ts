/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Levels, metadataStore } from '../main.js';
import { Ev1527Button } from '../../events/ev1527-button.js';
import { Ev1527Device } from '../../device/ev1527.js';
import { Ev1527Transport } from '../../transport/ev1527.js';
import { Logger } from '../../log.js';
import { StatelessMultiValueEvent } from '../../items/event.js';
import { lastSeen } from '../properties/sensors.js';

export const ev1527ButtonX4 = (
  logger: Logger,
  transport: Ev1527Transport,
  address: number
) => {
  const device = new Ev1527Device(logger, transport, address);

  const result = {
    $: new StatelessMultiValueEvent(device.addEvent(new Ev1527Button()), [
      'bottomLeft',
      'bottomRight',
      'topLeft',
      'topRight',
    ]).state,
    ...lastSeen(device.seen),
  };

  metadataStore.set(result, {
    level: Levels.DEVICE,
  });

  return result;
};

export const ev1527ButtonX1 = (
  transport: Ev1527Transport,
  address: number,
  logger: Logger
) => {
  const device = new Ev1527Device(logger, transport, address);

  const result = {
    $: new StatelessMultiValueEvent(device.addEvent(new Ev1527Button()), [
      'bottomRight',
    ]).state.bottomRight,
    ...lastSeen(device.seen),
  };

  metadataStore.set(result, {
    level: Levels.DEVICE,
  });

  return result;
};
