/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Ev1527Device } from '../../device/ev1527.js';
import { Ev1527Button } from '../../events/ev1527-button.js';
import { StatelessMultiValueEvent } from '../../items/event.js';
import { Ev1527Transport } from '../../transport/ev1527.js';
import { Context } from '../context.js';
import { ev1527Device } from '../elements/device.js';

export const ev1527ButtonX4 = (
  address: number,
  transport: Ev1527Transport,
  { logger }: Context,
) => {
  const device = new Ev1527Device(logger, transport, address);

  return {
    ...ev1527Device(device),
    state: new StatelessMultiValueEvent(device.addEvent(new Ev1527Button()), [
      'bottomLeft',
      'bottomRight',
      'topLeft',
      'topRight',
    ]).state,
  };
};

export const ev1527ButtonX1 = (
  address: number,
  transport: Ev1527Transport,
  { logger }: Context,
) => {
  const device = new Ev1527Device(logger, transport, address);

  return {
    ...ev1527Device(device),
    state: new StatelessMultiValueEvent(device.addEvent(new Ev1527Button()), [
      'bottomLeft',
    ]).state.bottomLeft,
  };
};
