/* eslint-disable sort-keys */

import { FloatLE, MappedStruct, TStruct, UIntLE } from '../struct.js';
import { Service } from '../device/main.js';

const request = new MappedStruct({
  temperature: new FloatLE(),
  humidity: new FloatLE(),
});

export type Sgp30Request = TStruct<typeof request>;

const response = new MappedStruct({
  h2: new UIntLE(),
  ethanol: new UIntLE(),
  tvoc: new UIntLE(),
  eco2: new UIntLE(),
});

export type Sgp30Response = TStruct<typeof response>;

export class Sgp30 extends Service<Sgp30Response, Sgp30Request> {
  constructor(index = 0) {
    super(Buffer.from([7, index]), 2000);
  }

  protected decode(input: Buffer): Sgp30Response | null {
    try {
      return response.decode(input);
    } catch {
      return null;
    }
  }

  protected encode(input: Sgp30Request): Buffer {
    return request.encode(input);
  }
}
