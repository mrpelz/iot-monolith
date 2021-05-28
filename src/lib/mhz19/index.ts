import { Service } from '../device/index.js';

export type Mhz19Response = {
  abc: boolean;
  accuracy: number;
  co2: number;
  temperature: number;
  transmittance: number;
};

export class Mhz19 extends Service<Mhz19Response, void> {
  constructor() {
    super(Buffer.from([11]));
  }

  protected decode(input: Buffer): Mhz19Response | null {
    if (input.length < 14) return null;

    return {
      abc: input.subarray(1, 2).readUInt8() !== 0, // 2.
      accuracy: input.subarray(0, 1).readUInt8(), // 1.
      co2: input.subarray(2, 6).readInt32LE(), // 3.
      temperature: input.subarray(6, 10).readFloatLE(), // 4.
      transmittance: input.subarray(10, 14).readFloatLE(), // 5.
    };
  }
}
