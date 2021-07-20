import { Event } from '../device/main.js';

export type Rf433Payload = {
  protocol: number;
  value: number;
};

export class Rf433 extends Event<Rf433Payload> {
  constructor() {
    super(Buffer.from([0xfc]));
  }

  protected decode(input: Buffer): Rf433Payload | null {
    if (input.length < 5) return null;

    return {
      protocol: input.subarray(0, 1).readUInt8(), // 1.
      value: input.subarray(1, 5).readUInt32LE(), // 2.
    };
  }
}
