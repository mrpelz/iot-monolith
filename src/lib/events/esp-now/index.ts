import { Event } from '../../device/index.js';

export type ESPNowPayload = {
  deviceIdentifier: Buffer;
  payload: Buffer;
};

export class ESPNow extends Event<ESPNowPayload> {
  constructor() {
    super(Buffer.from([0xfe]));
  }

  protected decode(input: Buffer): ESPNowPayload | null {
    if (input.length < 6) return null;

    const deviceIdentifier = input.subarray(0, 6);
    const payload = input.subarray(6);

    return {
      deviceIdentifier,
      payload,
    };
  }
}
