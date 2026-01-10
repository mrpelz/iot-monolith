import { Event } from '../device/main.js';

export class Ev1527MotionSensor extends Event<true> {
  constructor() {
    super(Buffer.of(0));
  }

  protected decode(): true {
    return true;
  }
}
