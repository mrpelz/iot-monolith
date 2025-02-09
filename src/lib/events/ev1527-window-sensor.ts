import { Event } from '../device/main.js';
import { Bitmap } from '../struct/main.js';

export type Ev1527WindowSensorPayload = {
  open: boolean;
  tamperSwitch: boolean;
};

const payload = new Bitmap();

export class Ev1527WindowSensor extends Event<Ev1527WindowSensorPayload> {
  constructor() {
    super(Buffer.of(0));
  }

  protected decode(input: Buffer): Ev1527WindowSensorPayload | null {
    try {
      const [tamperSwitch, , closed] = payload.decode(input);

      return { open: tamperSwitch || !closed, tamperSwitch };
    } catch {
      return null;
    }
  }
}
