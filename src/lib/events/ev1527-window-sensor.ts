import { Bitmap } from '../struct/main.js';
import { Event } from '../device/main.js';
import { emptyBuffer } from '../data.js';

export type Ev1527WindowSensorPayload = {
  open: boolean;
  tamperSwitch: boolean;
};

const payload = new Bitmap();

export class Ev1527WindowSensor extends Event<Ev1527WindowSensorPayload> {
  constructor() {
    super(emptyBuffer);
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
