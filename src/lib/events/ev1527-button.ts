import { Event } from '../device/main.js';
import { Timer } from '../timer.js';
import { emptyBuffer } from '../data.js';

const REPEAT_HOLDOFF_TIME = 250;

export type Ev1527ButtonPayload = {
  bottomLeft: boolean;
  bottomRight: boolean;
  topLeft: boolean;
  topRight: boolean;
};

export class Ev1527Button extends Event<Ev1527ButtonPayload> {
  private readonly _timer = new Timer(REPEAT_HOLDOFF_TIME);

  constructor() {
    super(emptyBuffer);
  }

  protected decode(input: Buffer): Ev1527ButtonPayload | null {
    if (input.length < 1 || this._timer.isRunning) return null;

    this._timer.start();

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
