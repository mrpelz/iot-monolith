/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Ev1527Device } from '../../device/ev1527.js';
import { Ev1527Button } from '../../events/ev1527-button.js';
import { StatelessMultiValueEvent } from '../../items/event.js';
import { Ev1527Transport } from '../../transport/ev1527.js';
import { Context } from '../context.js';
import { ev1527Device } from '../elements/device.js';
import { buttonPrimitive } from '../properties/sensors.js';

export const ev1527ButtonX4 = (
  address: number,
  transport: Ev1527Transport,
  context: Context,
) => {
  const { logger } = context;

  const device = new Ev1527Device(logger, transport, address);

  const {
    state: { four, three, two, one },
  } = new StatelessMultiValueEvent(device.addEvent(new Ev1527Button()), [
    'one',
    'two',
    'three',
    'four',
  ]);

  return {
    $: 'ev1527ButtonX4' as const,
    $noMainReference: true as const,
    bottomLeft: buttonPrimitive(context, one),
    bottomRight: buttonPrimitive(context, two),
    device: ev1527Device(context, device),
    topLeft: buttonPrimitive(context, three),
    topRight: buttonPrimitive(context, four),
  };
};

export const ev1527ButtonWP07 = (
  address: number,
  transport: Ev1527Transport,
  context: Context,
) => {
  const { logger } = context;

  const device = new Ev1527Device(logger, transport, address);

  const {
    state: { four, three, two },
  } = new StatelessMultiValueEvent(device.addEvent(new Ev1527Button()), [
    'two',
    'three',
    'four',
  ]);

  return {
    $: 'ev1527ButtonWP07' as const,
    $noMainReference: true as const,
    device: ev1527Device(context, device),
    left: buttonPrimitive(context, three),
    middle: buttonPrimitive(context, four),
    right: buttonPrimitive(context, two),
  };
};

export const ev1527ButtonX1 = (
  address: number,
  transport: Ev1527Transport,
  context: Context,
) => {
  const { logger } = context;

  const device = new Ev1527Device(logger, transport, address);

  return {
    $: 'ev1527ButtonX1' as const,
    $noMainReference: true as const,
    button: buttonPrimitive(
      context,
      new StatelessMultiValueEvent(device.addEvent(new Ev1527Button()), ['one'])
        .state.one,
    ),
    device: ev1527Device(context, device),
  };
};
