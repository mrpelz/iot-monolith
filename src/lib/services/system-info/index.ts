import { Service } from '../../device/index.js';

export class SystemInfo extends Service<Buffer, void> {
  constructor() {
    super(Buffer.from([2]));
  }
}
