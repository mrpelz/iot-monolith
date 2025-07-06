import { Event } from '../device/main.js';
import { Bitmap } from '../struct/main.js';
import { Timer } from '../timer.js';

const REPEAT_HOLDOFF_TIME = 250;

const payload = new Bitmap();

export type Ev1527ButtonPayload = {
  bottomLeft: boolean;
  bottomRight: boolean;
  topLeft: boolean;
  topRight: boolean;
};

export class Ev1527Button extends Event<Ev1527ButtonPayload> {
  private readonly _timer = new Timer(REPEAT_HOLDOFF_TIME);

  constructor() {
    super(Buffer.of(0));
  }

  protected decode(input: Buffer): Ev1527ButtonPayload | null {
    if (this._timer.isRunning) return null;

    try {
      const [bottomLeft, bottomRight, topLeft, topRight] =
        payload.decode(input);

      this._timer.start();

      return { bottomLeft, bottomRight, topLeft, topRight };
    } catch {
      return null;
    }
  }
}
