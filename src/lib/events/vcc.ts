import { Event } from '../device/main.js';
import { UIntLE } from '../struct/main.js';

const payload = new UIntLE();

export class VCC extends Event<number> {
  constructor(index = 0) {
    super(Buffer.from([0xfd, index]));
  }

  protected decode(input: Buffer): number | null {
    try {
      return payload.decode(input);
    } catch {
      return null;
    }
  }
}
