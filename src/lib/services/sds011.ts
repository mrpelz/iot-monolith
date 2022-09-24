import { Service } from '../device/main.js';

export type Sds011Response = {
  pm025: number;
  pm10: number;
};

export class Sds011 extends Service<Sds011Response, void> {
  constructor(index = 0) {
    super(Buffer.from([10, index]), 40000);
  }

  protected decode(input: Buffer): Sds011Response | null {
    if (input.length < 8) return null;

    return {
      pm025: input.subarray(0, 4).readFloatLE(), // 1.
      pm10: input.subarray(4, 8).readFloatLE(), // 2.
    };
  }
}
