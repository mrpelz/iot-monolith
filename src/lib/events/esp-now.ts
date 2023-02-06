import { MappedStruct, StaticBuffer, TStruct } from '../struct/main.js';
import { Event } from '../device/main.js';

const payload = new MappedStruct({
  deviceIdentifier: new StaticBuffer(6),
});

export type ESPNowPayload = TStruct<typeof payload> & {
  data: Buffer;
};

export class ESPNow extends Event<ESPNowPayload> {
  constructor(index = 0) {
    super(Buffer.from([0xfe, index]));
  }

  protected decode(input: Buffer): ESPNowPayload | null {
    try {
      const [partialResult, data] = payload.decodeOpenended(input);
      return {
        ...partialResult,
        data,
      };
    } catch {
      return null;
    }
  }
}
