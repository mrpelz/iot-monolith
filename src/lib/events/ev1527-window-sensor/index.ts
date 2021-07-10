import { Event } from '../../device/index.js';
import { emptyBuffer } from '../../data/index.js';

export type Ev1527WindowSensorPayload = {
  open: boolean;
  tamperSwitch: boolean;
};

export class Ev1527WindowSensor extends Event<Ev1527WindowSensorPayload> {
  constructor() {
    super(emptyBuffer);
  }

  protected decode(input: Buffer): Ev1527WindowSensorPayload | null {
    if (input.length < 1) return null;

    const [byte] = input;

    /* eslint-disable no-bitwise */
    const tamperSwitch = Boolean(byte & 0b0001);
    const open = tamperSwitch || !(byte & 0b0100);
    /* eslint-enable no-bitwise */

    return {
      open,
      tamperSwitch,
    };
  }
}
