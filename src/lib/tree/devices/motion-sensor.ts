/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { UDPDevice } from '../../device/udp.js';
import { Context } from '../context.js';
import { ipDevice } from '../elements/device.js';
import { hmmdMotion, input } from '../properties/sensors.js';

export const motionSensorX1 = (
  host: string,
  context: Context,
  port = 1337,
  initiallyOnline?: boolean,
) => {
  const { logger } = context;

  const device = new UDPDevice(logger, host, port);

  return {
    $: 'motionSensor' as const,
    $noMainReference: true as const,
    device: ipDevice(context, device, false, undefined, initiallyOnline),
    motion: input(context, device, 0, 'motion'),
  };
};

export const motionSensorX6 = (
  host: string,
  context: Context,
  port = 1337,
  initiallyOnline?: boolean,
) => {
  const { logger } = context;

  const device = new UDPDevice(logger, host, port);

  return {
    $: 'motionSensor' as const,
    $noMainReference: true as const,
    device: ipDevice(context, device, false, undefined, initiallyOnline),
    motionPir0: input(context, device, 0, 'motion'),
    motionPir1: input(context, device, 1, 'motion'),
    motionPir2: input(context, device, 2, 'motion'),
    motionRadar0: input(context, device, 3, 'motion'),
    motionRadar1: input(context, device, 4, 'motion'),
    motionRadar2: input(context, device, 5, 'motion'),
  };
};

export const motionSensorHMMD = (
  host: string,
  context: Context,
  port = 1337,
  initiallyOnline?: boolean,
) => {
  const { logger } = context;

  const device = new UDPDevice(logger, host, port);

  return {
    $: 'motionSensor' as const,
    $noMainReference: true as const,
    device: ipDevice(context, device, false, undefined, initiallyOnline),
    motion: hmmdMotion(context, device, 0),
  };
};
