/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { UDPDevice } from '../../device/udp.js';
import { ESPNow } from '../../events/esp-now.js';
import { Rf433 } from '../../events/rf433.js';
import { ESPNowTransport } from '../../transport/esp-now.js';
import { Ev1527Transport } from '../../transport/ev1527.js';
import { Context } from '../context.js';
import { ipDevice } from '../elements/device.js';
import { rfReadout } from '../properties/sensors.js';

export const rfBridge = (
  host: string,
  context: Context,
  port = 1337,
  initiallyOnline = context.connect,
) => {
  const { logger } = context;

  const device = new UDPDevice(logger, host, port);

  const espNowEvent = device.addEvent(new ESPNow());
  const rf433Event = device.addEvent(new Rf433());

  return {
    device: ipDevice(context, device, false, undefined, initiallyOnline),
    espNowTransport: new ESPNowTransport(logger, espNowEvent),
    ev1527Transport: new Ev1527Transport(logger, rf433Event),
    rfReadout: rfReadout(context, espNowEvent, rf433Event),
  };
};
