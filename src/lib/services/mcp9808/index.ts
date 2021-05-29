import { Service } from '../../device/index.js';

export class Mcp9808 extends Service<number, void> {
  constructor() {
    super(Buffer.from([4]));
  }

  protected decode(input: Buffer): number | null {
    if (input.length < 4) return null;

    return input.readFloatLE();
  }
}
