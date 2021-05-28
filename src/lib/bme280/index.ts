import { Service } from '../device/index.js';

export type Bme280Response = {
  humidity: number;
  pressure: number;
  temperature: number;
};

export class Bme280 extends Service<Bme280Response, void> {
  constructor() {
    super(Buffer.from([5]));
  }

  protected decode(input: Buffer): Bme280Response | null {
    if (input.length < 12) return null;

    return {
      humidity: input.subarray(4, 8).readFloatLE(), // 2.
      pressure: input.subarray(8, 12).readFloatLE(), // 3.
      temperature: input.subarray(0, 4).readFloatLE(), // 1.
    };
  }
}
