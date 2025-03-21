import { Service } from '../device/main.js';
import { FloatLE } from '../struct/main.js';

const response = new FloatLE();

export class Tsl2561 extends Service<number, void> {
  constructor(index = 0) {
    super(Buffer.from([6, index]), 2000);
  }

  protected decode(input: Buffer): number | null {
    try {
      return response.decode(input);
    } catch {
      return null;
    }
  }
}
