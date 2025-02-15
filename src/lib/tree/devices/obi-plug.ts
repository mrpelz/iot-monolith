/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { UDPDevice } from '../../device/udp.js';
import { Indicator } from '../../services/indicator.js';
import { Context } from '../context.js';
import { ipDevice } from '../elements/device.js';
import { output } from '../properties/actuators.js';
import { button } from '../properties/sensors.js';

export const obiPlug = <T extends string>(
  topic: T,
  host: string,
  { connect, logger, persistence, timings }: Context,
  port = 1337,
  initiallyOnline = connect,
) => {
  const device = new UDPDevice(logger, host, port);

  const indicator = device.addService(new Indicator(0));

  return {
    ...ipDevice(
      device,
      false,
      persistence,
      timings,
      indicator,
      initiallyOnline,
    ),
    button: button(device, 0),
    indicator,
    internal: {
      $noMainReference: true as const,
      relay: output(device, 0, topic, indicator, persistence),
    },
  };
};
