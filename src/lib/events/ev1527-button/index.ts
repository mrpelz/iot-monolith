import { Event } from '../../device/index.js';
import { emptyBuffer } from '../../data/index.js';

export type Ev1527ButtonPayload = {
  bottomLeft: boolean;
  bottomRight: boolean;
  topLeft: boolean;
  topRight: boolean;
};

export class Ev1527Button extends Event<Ev1527ButtonPayload> {
  constructor() {
    super(emptyBuffer);
  }

  protected decode(input: Buffer): Ev1527ButtonPayload | null {
    if (input.length < 1) return null;

    const [byte] = input;

    /* eslint-disable no-bitwise */
    return {
      bottomLeft: Boolean(byte & 0b0010),
      bottomRight: Boolean(byte & 0b0001),
      topLeft: Boolean(byte & 0b0100),
      topRight: Boolean(byte & 0b1000),
    };
    /* eslint-enable no-bitwise */
  }
}
