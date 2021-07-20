import { Event } from '../device/main.js';

export class Input extends Event<boolean> {
  constructor(index: number) {
    super(Buffer.from([0xa0 + index]));
  }

  protected decode(input: Buffer): boolean | null {
    if (!input.length) return null;

    return input[0] !== 0;
  }
}
