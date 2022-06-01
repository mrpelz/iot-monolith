import { Event } from '../device/main.js';

export class VCC extends Event<number> {
  constructor(index = 0) {
    super(Buffer.from([0xfd, index]));
  }

  protected decode(input: Buffer): number | null {
    if (input.length < 2) return null;

    return input.readUInt16LE();
  }
}
