import { Event } from '../device/main.js';

export type ESPNowPayload = {
  data: Buffer;
  deviceIdentifier: Buffer;
};

export class ESPNow extends Event<ESPNowPayload> {
  constructor() {
    super(Buffer.from([0xfe]));
  }

  protected decode(input: Buffer): ESPNowPayload | null {
    if (input.length < 6) return null;

    const deviceIdentifier = input.subarray(0, 6);
    const data = input.subarray(6);

    return {
      data,
      deviceIdentifier,
    };
  }
}
