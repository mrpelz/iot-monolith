/* eslint-disable sort-keys */

import { Service } from '../device/main.js';
import { FloatLE, MappedStruct, TStruct } from '../struct/main.js';

const response = new MappedStruct({
  temperature: new FloatLE(),
  humidity: new FloatLE(),
  pressure: new FloatLE(),
});

export type Bme280Response = TStruct<typeof response>;

export class Bme280 extends Service<Bme280Response, void> {
  constructor(index = 0) {
    super(Buffer.from([5, index]));
  }

  protected decode(input: Buffer): Bme280Response | null {
    try {
      return response.decode(input);
    } catch {
      return null;
    }
  }
}
