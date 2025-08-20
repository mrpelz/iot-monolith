import { Bool } from '@mrpelz/struct';

import { Service } from '../device/main.js';

const request = new Bool();

export class Output extends Service<null, boolean> {
  constructor(index: number) {
    super(Buffer.from([0xa0, index]));
  }

  protected encode(input: boolean): Buffer {
    return request.encode(input);
  }
}
