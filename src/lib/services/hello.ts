import { Service } from '../device/main.js';

export class Hello extends Service<string, void> {
  constructor() {
    super(Buffer.from([1]));
  }

  protected decode(input: Buffer): string {
    return input.toString('ascii');
  }
}
