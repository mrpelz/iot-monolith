/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { element, symbolInstance } from '../main.js';
import { Ev1527Button } from '../../events/ev1527-button.js';
import { Ev1527Device } from '../../device/ev1527.js';
import { Ev1527Transport } from '../../transport/ev1527.js';
import { Logger } from '../../log.js';
import { StatelessMultiValueEvent } from '../../items/event.js';
import { ev1527Device } from '../elements/device.js';

export const ev1527ButtonX4 = (
  transport: Ev1527Transport,
  address: number,
  logger: Logger
) => {
  const device = new Ev1527Device(logger, transport, address);

  return element({
    ...ev1527Device(device),
    [symbolInstance]: new StatelessMultiValueEvent(
      device.addEvent(new Ev1527Button()),
      ['bottomLeft', 'bottomRight', 'topLeft', 'topRight']
    ).state,
  });
};

export const ev1527ButtonX1 = (
  transport: Ev1527Transport,
  address: number,
  logger: Logger
) => {
  const device = new Ev1527Device(logger, transport, address);

  return element({
    ...ev1527Device(device),
    [symbolInstance]: new StatelessMultiValueEvent(
      device.addEvent(new Ev1527Button()),
      ['bottomLeft']
    ).state.bottomLeft,
  });
};
