import { Event } from '../device/main.js';

export type ButtonPayload = {
  down: boolean;
  downChanged: boolean;
  longpress: number;
  pressedMap: boolean[];
  previousDuration: number;
  repeat: number;
};

export class Button extends Event<ButtonPayload> {
  constructor(index: number) {
    super(Buffer.from([index]));
  }

  protected decode(input: Buffer): ButtonPayload | null {
    if (input.length < 8) return null;

    return {
      down: input.subarray(0, 1).readUInt8() !== 0, // 1.
      downChanged: input.subarray(1, 2).readUInt8() !== 0, // 2.
      longpress: input.subarray(3, 4).readUInt8(), // 4.
      pressedMap: [...input.subarray(8)].map((value) => value !== 0), // 6.
      previousDuration: input.subarray(4, 8).readUInt32LE(), // 5.
      repeat: input.subarray(2, 3).readUInt8(), // 3.
    };
  }
}
