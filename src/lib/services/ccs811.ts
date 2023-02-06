/* eslint-disable sort-keys */

import { FloatLE, MappedStruct, TStruct, UIntLE } from '../struct/main.js';
import { Service } from '../device/main.js';

const request = new MappedStruct({
  temperature: new FloatLE(),
  humidity: new FloatLE(),
});

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
export type Ccs811Request = TStruct<typeof request>;

const response = new MappedStruct({
  temperature: new UIntLE(),
  tvoc: new UIntLE(),
  eco2: new UIntLE(),
});

export type Ccs811Response = TStruct<typeof response>;

export class Ccs811 extends Service<Ccs811Response, Ccs811Request> {
  constructor(index = 0) {
    super(Buffer.from([8, index]), 2000);
  }

  protected decode(input: Buffer): Ccs811Response | null {
    try {
      return response.decode(input);
    } catch {
      return null;
    }
  }

  protected encode(input: Ccs811Request): Buffer {
    return request.encode(input);
  }
}
