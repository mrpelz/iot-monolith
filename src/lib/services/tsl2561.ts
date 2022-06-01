import { Service } from '../device/main.js';

export class Tsl2561 extends Service<number, void> {
  constructor(index = 0) {
    super(Buffer.from([6, index]));
  }

  protected decode(input: Buffer): number | null {
    if (input.length < 4) return null;

    return input.readFloatLE();
  }
}
