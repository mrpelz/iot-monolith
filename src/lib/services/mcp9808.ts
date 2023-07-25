import { Service } from '../device/main.js';
import { FloatLE } from '../struct/main.js';

const response = new FloatLE();

export class Mcp9808 extends Service<number, void> {
  constructor(index = 0) {
    super(Buffer.from([4, index]));
  }

  protected decode(input: Buffer): number | null {
    try {
      return response.decode(input);
    } catch {
      return null;
    }
  }
}
