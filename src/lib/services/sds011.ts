import { Service } from '../device/main.js';
import { FloatLE, MappedStruct, TStruct } from '../struct/main.js';

const response = new MappedStruct({
  pm025: new FloatLE(),
  pm10: new FloatLE(),
});

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
export type Sds011Response = TStruct<typeof response>;

export class Sds011 extends Service<Sds011Response, void> {
  constructor(index = 0) {
    super(Buffer.from([10, index]), 40_000);
  }

  protected decode(input: Buffer): Sds011Response | null {
    try {
      return response.decode(input);
    } catch {
      return null;
    }
  }
}
