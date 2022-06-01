import { Service } from '../device/main.js';

export class Output extends Service<null, boolean> {
  constructor(index: number) {
    super(Buffer.from([0xa0, index]));
  }

  protected encode(input: boolean): Buffer {
    return Buffer.from([input ? 1 : 0]);
  }
}
