import { Service } from '../../device/index.js';

export class Async extends Service<Buffer, void> {
  constructor() {
    super(Buffer.from([3]), 32000);
  }
}
