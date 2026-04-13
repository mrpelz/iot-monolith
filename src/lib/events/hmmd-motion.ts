/* eslint-disable sort-keys */
import { Bool, IntLE, MappedStruct, TStruct } from '@mrpelz/struct';

import { Event } from '../device/main.js';

const payload = new MappedStruct({
  targetDetected: new Bool(),
  distance: new IntLE(2),
});

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
export type HmmdMotionPayload = TStruct<typeof payload>;

export class HmmdMotion extends Event<HmmdMotionPayload> {
  constructor(index: number) {
    super(Buffer.from([0x9f, index]));
  }

  protected decode(input: Buffer): HmmdMotionPayload | null {
    try {
      return payload.decode(input);
    } catch {
      return null;
    }
  }
}
