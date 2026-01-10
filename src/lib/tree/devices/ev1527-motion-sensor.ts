/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Ev1527Device } from '../../device/ev1527.js';
import { Ev1527MotionSensor } from '../../events/ev1527-motion-sensor.js';
import { StatelessSingleValueEvent } from '../../items/event.js';
import { Ev1527Transport } from '../../transport/ev1527.js';
import { Context } from '../context.js';
import { ev1527Device } from '../elements/device.js';

export const ev1527MotionSensor = (
  address: number,
  transport: Ev1527Transport,
  context: Context,
) => {
  const { logger } = context;

  const device = new Ev1527Device(logger, transport, address);

  return {
    $noMainReference: true as const,
    device: ev1527Device(context, device),
    state: new StatelessSingleValueEvent(
      device.addEvent(new Ev1527MotionSensor()),
    ).state,
  };
};
