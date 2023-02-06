import { Service } from '../device/main.js';
import { UIntLE } from '../struct/main.js';

const response = new UIntLE();

export class Veml6070 extends Service<number, void> {
  constructor(index = 0) {
    super(Buffer.from([9, index]));
  }

  protected decode(input: Buffer): number | null {
    try {
      return response.decode(input);
    } catch {
      return null;
    }
  }
}
