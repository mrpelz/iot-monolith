import { Service } from '../device/main.js';

export class Async extends Service<Buffer, void> {
  constructor() {
    super(Buffer.from([3]), 32_000);
  }
}
