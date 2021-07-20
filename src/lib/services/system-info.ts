import { Service } from '../device/main.js';

export class SystemInfo extends Service<Buffer, void> {
  constructor() {
    super(Buffer.from([2]));
  }
}
