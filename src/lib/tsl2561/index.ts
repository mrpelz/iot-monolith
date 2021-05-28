import { Service } from '../device/index.js';

export class Tsl2561 extends Service<number, void> {
  constructor() {
    super(Buffer.from([6]));
  }

  protected decode(input: Buffer): number | null {
    if (input.length < 4) return null;

    return input.readFloatLE();
  }
}
