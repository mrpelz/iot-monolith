import { UInt8 } from '@mrpelz/struct';

import { Service } from '../device/main.js';

const request = new UInt8();

export class Led extends Service<null, number> {
  constructor(index: number) {
    super(Buffer.from([0xb0, index]));
  }

  protected encode(input: number): Buffer {
    return request.encode(input);
  }
}
