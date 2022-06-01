import { Service } from '../device/main.js';

export class Led extends Service<null, number> {
  constructor(index: number) {
    super(Buffer.from([0xb0, index]));
  }

  protected encode(input: number): Buffer {
    return Buffer.from([input]);
  }
}
