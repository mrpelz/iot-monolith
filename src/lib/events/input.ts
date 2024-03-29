import { Bool } from '../struct/main.js';
import { Event } from '../device/main.js';

const payload = new Bool();

export class Input extends Event<boolean> {
  constructor(index: number) {
    super(Buffer.from([0xa0, index]));
  }

  protected decode(input: Buffer): boolean | null {
    try {
      return payload.decode(input);
    } catch {
      return null;
    }
  }
}
