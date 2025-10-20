import { Timer } from '@mrpelz/observable/timer';
import { Bitmap } from '@mrpelz/struct';

import { Event } from '../device/main.js';

const REPEAT_HOLDOFF_TIME = 250;

const payload = new Bitmap();

export type Ev1527ButtonPayload = {
  eight: boolean;
  five: boolean;
  four: boolean;
  one: boolean;
  seven: boolean;
  six: boolean;
  three: boolean;
  two: boolean;
};

export class Ev1527Button extends Event<Ev1527ButtonPayload> {
  private readonly _timer = new Timer(REPEAT_HOLDOFF_TIME);

  constructor() {
    super(Buffer.of(0));
  }

  protected decode(input: Buffer): Ev1527ButtonPayload | null {
    if (this._timer.isActive.value) return null;

    try {
      const [one, two, three, four, five, six, seven, eight] =
        payload.decode(input);

      this._timer.start();

      return {
        eight,
        five,
        four,
        one,
        seven,
        six,
        three,
        two,
      };
    } catch {
      return null;
    }
  }
}
