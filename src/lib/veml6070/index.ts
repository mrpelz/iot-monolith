import { Service } from '../device/index.js';

export class Veml6070 extends Service<number, void> {
  constructor() {
    super(Buffer.from([9]));
  }

  protected decode(input: Buffer): number | null {
    if (input.length < 2) return null;

    return input.readUInt16LE();
  }
}
