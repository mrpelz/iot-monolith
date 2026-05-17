/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { UDPDevice } from '../../device/udp.js';
import { Indicator } from '../../services/indicator.js';
import { Context } from '../context.js';
import { ipDevice } from '../elements/device.js';
import { input, motionHMMD } from '../properties/sensors.js';

export const motionSensorX1 = (
  host: string,
  context: Context,
  port = 1337,
  initiallyOnline?: boolean,
) => {
  const { logger } = context;

  const device = new UDPDevice(logger, host, port);

  const indicatorR = device.addService(new Indicator(0));
  const indicatorG = device.addService(new Indicator(1));
  const indicatorB = device.addService(new Indicator(2));

  return {
    $: 'motionSensor' as const,
    $noMainReference: true as const,
    device: ipDevice(context, device, false, indicatorB, initiallyOnline),
    indicatorB,
    indicatorG,
    indicatorR,
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

  const indicatorR = device.addService(new Indicator(0));
  const indicatorG = device.addService(new Indicator(1));
  const indicatorB = device.addService(new Indicator(2));

  return {
    $: 'motionSensor' as const,
    $noMainReference: true as const,
    device: ipDevice(context, device, false, indicatorB, initiallyOnline),
    indicatorB,
    indicatorG,
    indicatorR,
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

  const indicatorR = device.addService(new Indicator(0));
  const indicatorG = device.addService(new Indicator(1));
  const indicatorB = device.addService(new Indicator(2));

  return {
    $: 'motionSensor' as const,
    $noMainReference: true as const,
    device: ipDevice(context, device, false, indicatorB, initiallyOnline),
    indicatorB,
    indicatorG,
    indicatorR,
    motion: motionHMMD(context, device, 0),
  };
};

export const motionSensorHMMDX3 = (
  host: string,
  context: Context,
  port = 1337,
  initiallyOnline?: boolean,
) => {
  const { logger } = context;

  const device = new UDPDevice(logger, host, port);

  const indicatorR = device.addService(new Indicator(0));
  const indicatorG = device.addService(new Indicator(1));
  const indicatorB = device.addService(new Indicator(2));

  return {
    $: 'motionSensor' as const,
    $noMainReference: true as const,
    device: ipDevice(context, device, false, indicatorB, initiallyOnline),
    indicatorB,
    indicatorG,
    indicatorR,
    motionHMMD: motionHMMD(context, device, 0),
    motionPir0: input(context, device, 0, 'motion'),
    motionPir1: input(context, device, 1, 'motion'),
    motionPir2: input(context, device, 2, 'motion'),
  };
};
