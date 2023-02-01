import { Service } from '../device/main.js';
import { UInt8 } from '../struct.js';

const request = new UInt8();

export class Led extends Service<null, number> {
  constructor(index: number) {
    super(Buffer.from([0xb0, index]));
  }

  protected encode(input: number): Buffer {
    return request.encode(input);
  }
}
