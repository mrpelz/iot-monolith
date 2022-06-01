import { Service } from '../device/main.js';

export class Veml6070 extends Service<number, void> {
  constructor(index = 0) {
    super(Buffer.from([9, index]));
  }

  protected decode(input: Buffer): number | null {
    if (input.length < 2) return null;

    return input.readUInt16LE();
  }
}
