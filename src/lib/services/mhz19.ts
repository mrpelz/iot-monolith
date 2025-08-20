/* eslint-disable sort-keys */

import {
  Bool,
  FloatLE,
  IntLE,
  MappedStruct,
  TStruct,
  UInt8,
} from '@mrpelz/struct';

import { Service } from '../device/main.js';

const response = new MappedStruct({
  accuracy: new UInt8(),
  abc: new Bool(),
  co2: new IntLE(4),
  temperature: new FloatLE(),
  transmittance: new FloatLE(),
});

export type Mhz19Response = TStruct<typeof response>;

export class Mhz19 extends Service<Mhz19Response, void> {
  constructor(index = 0) {
    super(Buffer.from([11, index]));
  }

  protected decode(input: Buffer): Mhz19Response | null {
    try {
      return response.decode(input);
    } catch {
      return null;
    }
  }
}
